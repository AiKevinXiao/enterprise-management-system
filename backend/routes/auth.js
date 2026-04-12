const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB, all, get, run } = require('../db');

const router = express.Router();

const { JWT_SECRET } = require('../middleware/auth');
const JWT_EXPIRES = '24h';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 300;

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: '请输入用户名和密码' });
  }

  const user = get('SELECT * FROM users WHERE username = ?', [username]);

  if (!user) {
    logLogin(username, req.ip, false, '用户不存在');
    return res.status(401).json({ message: '用户名或密码错误' });
  }

  if (user.status === 'disabled') {
    return res.status(403).json({ message: '账号已被禁用，请联系管理员' });
  }

  if (user.status === 'pending') {
    return res.status(403).json({ message: '账号待激活，请联系管理员' });
  }

  const isValid = bcrypt.compareSync(password, user.password);

  if (!isValid) {
    logLogin(username, req.ip, false, '密码错误');

    const attempts = getFailedAttempts(username);
    const newAttempts = attempts + 1;

    if (newAttempts >= MAX_ATTEMPTS) {
      return res.status(423).json({
        message: `登录失败次数过多，账号已锁定${LOCKOUT_DURATION / 60}分钟`,
        locked: true,
        remaining: LOCKOUT_DURATION
      });
    }

    const remaining = MAX_ATTEMPTS - newAttempts;
    return res.status(401).json({
      message: `用户名或密码错误，还剩${remaining}次尝试机会`,
      attempts: newAttempts,
      remaining
    });
  }

  run('UPDATE users SET last_login = datetime(\'now\', \'localtime\') WHERE id = ?', [user.id]);

  logLogin(username, req.ip, true, '登录成功');

  const token = jwt.sign(
    { id: user.id, username: user.username, role_id: user.role_id },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  const role = get('SELECT * FROM roles WHERE id = ?', [user.role_id]);
  const dept = get('SELECT * FROM departments WHERE id = ?', [user.dept_id]);

  res.json({
    message: '登录成功',
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      phone: user.phone,
      email: user.email,
      status: user.status,
      role: role ? { id: role.id, name: role.name, code: role.code, data_scope: role.data_scope } : null,
      dept: dept ? { id: dept.id, name: dept.name } : null,
      last_login: user.last_login
    }
  });
});

router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未登录' });
  }

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    const user = get('SELECT * FROM users WHERE id = ?', [decoded.id]);

    if (!user) {
      return res.status(401).json({ message: '用户不存在' });
    }

    const role = get('SELECT * FROM roles WHERE id = ?', [user.role_id]);
    const permissions = all(
      'SELECT p.* FROM permissions p JOIN role_permissions rp ON p.id = rp.permission_id WHERE rp.role_id = ?',
      [user.role_id]
    );

    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      phone: user.phone,
      email: user.email,
      status: user.status,
      role: role ? { id: role.id, name: role.name, code: role.code, data_scope: role.data_scope } : null,
      permissions: permissions.map(p => p.code)
    });
  } catch (err) {
    return res.status(401).json({ message: 'Token无效或已过期' });
  }
});

router.post('/logout', (req, res) => {
  res.json({ message: '退出成功' });
});

function getFailedAttempts(username) {
  const result = get(
    'SELECT COUNT(*) as count FROM login_logs WHERE username = ? AND success = 0 AND created_at > datetime(\'now\', \'-5 minutes\', \'localtime\')',
    [username]
  );
  return result ? result.count : 0;
}

function logLogin(username, ip, success, message) {
  run(
    'INSERT INTO login_logs (username, ip, success, message) VALUES (?, ?, ?, ?)',
    [username, ip, success ? 1 : 0, message]
  );
}

module.exports = router;

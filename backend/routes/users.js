const express = require('express');
const { all, get, run } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// 密码复杂度校验
function validatePassword(password) {
  if (!password || password.length < 8) return '密码至少8位';
  if (!/[A-Z]/.test(password)) return '密码必须包含大写字母';
  if (!/[a-z]/.test(password)) return '密码必须包含小写字母';
  if (!/[0-9]/.test(password)) return '密码必须包含数字';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return '密码必须包含特殊字符';
  return null;
}

router.get('/', (req, res) => {
  const { keyword = '', dept_id, role_id, status, page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;

  let where = '1=1';
  const params = [];

  if (keyword) {
    where += ' AND (u.name LIKE ? OR u.username LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (dept_id) { where += ' AND u.dept_id = ?'; params.push(dept_id); }
  if (role_id) { where += ' AND u.role_id = ?'; params.push(role_id); }
  if (status) { where += ' AND u.status = ?'; params.push(status); }

  const totalResult = get(`SELECT COUNT(*) as count FROM users u WHERE ${where} AND u.deleted_at IS NULL`, params);
  const users = all(
    `SELECT u.*, d.name as dept_name, r.name as role_name
     FROM users u
     LEFT JOIN departments d ON u.dept_id = d.id
     LEFT JOIN roles r ON u.role_id = r.id
     WHERE ${where} AND u.deleted_at IS NULL
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, parseInt(pageSize), parseInt(offset)]
  );

  // 手机号脱敏处理
  const maskPhone = (phone) => {
    if (!phone || phone.length < 7) return phone;
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  };

  const maskedUsers = users.map(user => ({
    ...user,
    phone: maskPhone(user.phone)
  }));

  res.json({
    list: maskedUsers,
    total: totalResult ? totalResult.count : 0,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  });
});

router.get('/:id', (req, res) => {
  const user = get(
    'SELECT u.*, d.name as dept_name, r.name as role_name FROM users u LEFT JOIN departments d ON u.dept_id = d.id LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
    [req.params.id]
  );
  if (!user) return res.status(404).json({ message: '用户不存在' });
  res.json(user);
});

// 创建用户
router.post('/', (req, res) => {
  const { username, password, name, email, phone, dept_id, role_id, status = 'active' } = req.body;
  
  if (!username || !password || !name) {
    return res.status(400).json({ message: '用户名、密码和姓名为必填项' });
  }

  const pwdError = validatePassword(password);
  if (pwdError) {
    return res.status(400).json({ message: pwdError });
  }

  // 检查用户名是否已存在
  const existing = get('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) {
    return res.status(400).json({ message: '用户名已存在' });
  }

  // 简单密码哈希（生产环境应使用 bcrypt）
  const crypto = require('crypto');
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

  const result = run(
    `INSERT INTO users (username, password, name, email, phone, dept_id, role_id, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [username, passwordHash, name, email, phone, dept_id, role_id, status]
  );

  res.status(201).json({
    id: result.lastInsertRowid,
    username,
    name,
    email,
    phone,
    dept_id,
    role_id,
    status,
    message: '用户创建成功'
  });
});

// 更新用户
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, phone, dept_id, role_id, status } = req.body;

  const user = get('SELECT id FROM users WHERE id = ?', [id]);
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }

  run(
    `UPDATE users SET name = ?, email = ?, phone = ?, dept_id = ?, role_id = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
    [name, email, phone, dept_id, role_id, status, id]
  );

  res.json({ id, name, email, phone, dept_id, role_id, status, message: '用户更新成功' });
});

// 删除用户
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const user = get('SELECT id, username FROM users WHERE id = ?', [id]);
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }

  // 不允许删除自己
  if (req.user && req.user.id === parseInt(id)) {
    return res.status(400).json({ message: '不能删除自己的账号' });
  }

  run("UPDATE users SET deleted_at = datetime('now', 'localtime') WHERE id = ?", [id]);
  res.json({ message: '用户删除成功' });
});

// 重置密码
router.put('/:id/reset-password', (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  const pwdError = validatePassword(password);
  if (pwdError) {
    return res.status(400).json({ message: pwdError });
  }

  const user = get('SELECT id FROM users WHERE id = ?', [id]);
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }

  const crypto = require('crypto');
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

  run('UPDATE users SET password = ?, updated_at = datetime(\'now\') WHERE id = ?', [passwordHash, id]);
  res.json({ message: '密码重置成功' });
});

// 批量操作
router.post('/batch', (req, res) => {
  const { action, ids } = req.body;

  if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: '参数错误' });
  }

  const placeholders = ids.map(() => '?').join(',');
  let sql, params;

  switch (action) {
    case 'enable':
      sql = `UPDATE users SET status = 'active', updated_at = datetime('now') WHERE id IN (${placeholders})`;
      params = ids;
      break;
    case 'disable':
      sql = `UPDATE users SET status = 'disabled', updated_at = datetime('now') WHERE id IN (${placeholders})`;
      params = ids;
      break;
    case 'delete':
      // 不能删除自己
      const filteredIds = req.user ? ids.filter(id => id !== req.user.id) : ids;
      if (filteredIds.length === 0) {
        return res.status(400).json({ message: '不能删除自己的账号' });
      }
      sql = `UPDATE users SET deleted_at = datetime('now', 'localtime') WHERE id IN (${filteredIds.map(() => '?').join(',')})`;
      params = filteredIds;
      break;
    default:
      return res.status(400).json({ message: '不支持的操作类型' });
  }

  run(sql, params);
  res.json({ message: `批量${action === 'enable' ? '启用' : action === 'disable' ? '禁用' : '删除'}成功` });
});



// Restore a deleted user
router.put('/:id/restore', (req, res) => {
  const { id } = req.params;
  const user = get('SELECT id FROM users WHERE id = ? AND deleted_at IS NOT NULL', [id]);
  if (!user) {
    return res.status(404).json({ message: '用户不存在或未被删除' });
  }
  run("UPDATE users SET deleted_at = NULL, updated_at = datetime('now', 'localtime') WHERE id = ?", [id]);
  res.json({ message: '用户恢复成功' });
});
module.exports = router;

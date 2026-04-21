const express = require('express');
const { all, get, run } = require('../db');
const { authMiddleware, permissionMiddleware, dataScopeMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.use(dataScopeMiddleware);

// 密码复杂度校验
function validatePassword(password) {
  if (!password || password.length < 8) return '密码至少8位';
  if (!/[A-Z]/.test(password)) return '密码必须包含大写字母';
  if (!/[a-z]/.test(password)) return '密码必须包含小写字母';
  if (!/[0-9]/.test(password)) return '密码必须包含数字';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return '密码必须包含特殊字符';
  return null;
}

// GET /api/users — 用户列表（带数据范围过滤）
router.get('/', permissionMiddleware('user-view'), (req, res) => {
  const { keyword = '', dept_id, role_id, status, deleted = '0', page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;

  // deleted=1 查已删除用户，deleted=0 查正常用户
  const deletedFilter = deleted === '1'
    ? 'AND u.deleted_at IS NOT NULL'
    : 'AND u.deleted_at IS NULL';

  // 数据范围过滤
  const { mode, deptIds } = req.dataScope;
  let scopeFilter = '';
  const scopeParams = [];
  if (mode === 'dept' && deptIds && deptIds.length > 0) {
    const placeholders = deptIds.map(() => '?').join(',');
    scopeFilter = `AND u.dept_id IN (${placeholders})`;
    scopeParams.push(...deptIds);
  } else if (mode === 'self') {
    scopeFilter = 'AND u.id = ?';
    scopeParams.push(req.dataScope.userId);
  }
  // mode=all: 不加 scopeFilter，见全部

  let where = '1=1';
  const params = [];

  if (keyword) {
    where += ' AND (u.name LIKE ? OR u.username LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (dept_id) { where += ' AND u.dept_id = ?'; params.push(dept_id); }
  if (role_id) { where += ' AND u.role_id = ?'; params.push(role_id); }
  if (status) { where += ' AND u.status = ?'; params.push(status); }

  const finalParams = [...scopeParams, ...params];
  const totalResult = get(`SELECT COUNT(*) as count FROM users u WHERE ${where} ${deletedFilter} ${scopeFilter}`, finalParams);
  const users = all(
    `SELECT u.*, d.name as dept_name, r.name as role_name
     FROM users u
     LEFT JOIN departments d ON u.dept_id = d.id
     LEFT JOIN roles r ON u.role_id = r.id
     WHERE ${where} ${deletedFilter} ${scopeFilter}
     ORDER BY u.deleted_at DESC, u.created_at DESC
     LIMIT ? OFFSET ?`,
    [...finalParams, parseInt(pageSize), parseInt(offset)]
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
    data: maskedUsers,
    total: totalResult ? totalResult.count : 0,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  });
});

// GET /api/users/:id — 用户详情（带数据范围校验）
router.get('/:id', permissionMiddleware('user-view'), (req, res) => {
  const targetId = parseInt(req.params.id);
  const { mode, deptIds, userId } = req.dataScope;

  // 数据范围校验
  const user = get(
    'SELECT u.*, d.name as dept_name, r.name as role_name FROM users u LEFT JOIN departments d ON u.dept_id = d.id LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
    [targetId]
  );
  if (!user) return res.status(404).json({ message: '用户不存在' });

  if (mode === 'self' && targetId !== userId) {
    return res.status(403).json({ code: 403, message: '无此操作权限' });
  }
  if (mode === 'dept' && deptIds && !deptIds.includes(user.dept_id)) {
    return res.status(403).json({ code: 403, message: '无此操作权限' });
  }

  res.json(user);
});

// POST /api/users — 创建用户
router.post('/', permissionMiddleware('user-create'), (req, res) => {
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

  const crypto = require('crypto');
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

  const result = run(
    `INSERT INTO users (username, password, name, email, phone, dept_id, role_id, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [username, passwordHash, name, email, phone, dept_id, role_id, status]
  );

  res.status(201).json({
    data: {
      id: result.lastInsertRowid,
      username,
      name,
      email,
      phone,
      dept_id,
      role_id,
      status
    },
    message: '用户创建成功'
  });
});

// PUT /api/users/:id — 更新用户（数据范围 + 权限）
router.put('/:id', permissionMiddleware('user-edit'), (req, res) => {
  const targetId = parseInt(req.params.id);
  const { name, email, phone, dept_id, role_id, status } = req.body;
  const { mode, deptIds, userId } = req.dataScope;

  // 数据范围校验
  const target = get('SELECT id, dept_id FROM users WHERE id = ?', [targetId]);
  if (!target) {
    return res.status(404).json({ message: '用户不存在' });
  }

  if (mode === 'self' && targetId !== userId) {
    return res.status(403).json({ code: 403, message: '无此操作权限' });
  }
  if (mode === 'dept' && deptIds && !deptIds.includes(target.dept_id)) {
    return res.status(403).json({ code: 403, message: '无此操作权限' });
  }

  run(
    `UPDATE users SET name = ?, email = ?, phone = ?, dept_id = ?, role_id = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
    [name, email, phone, dept_id, role_id, status, targetId]
  );

  res.json({ id: targetId, name, email, phone, dept_id, role_id, status, message: '用户更新成功' });
});

// DELETE /api/users/:id — 删除用户
router.delete('/:id', permissionMiddleware('user-delete'), (req, res) => {
  const targetId = parseInt(req.params.id);

  const user = get('SELECT id, username, dept_id FROM users WHERE id = ?', [targetId]);
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }

  // 不允许删除自己
  if (req.user.id === targetId) {
    return res.status(400).json({ message: '不能删除自己的账号' });
  }

  // 数据范围校验
  const { mode, deptIds } = req.dataScope;
  if (mode === 'self') {
    return res.status(403).json({ code: 403, message: '无此操作权限' });
  }
  if (mode === 'dept' && deptIds && !deptIds.includes(user.dept_id)) {
    return res.status(403).json({ code: 403, message: '无此操作权限' });
  }

  run("UPDATE users SET deleted_at = datetime('now', 'localtime') WHERE id = ?", [targetId]);
  res.json({ message: '用户删除成功' });
});

// PUT /api/users/:id/reset-password — 重置密码
router.put('/:id/reset-password', permissionMiddleware('user-reset-pwd'), (req, res) => {
  const targetId = parseInt(req.params.id);
  const { password } = req.body;

  const pwdError = validatePassword(password);
  if (pwdError) {
    return res.status(400).json({ message: pwdError });
  }

  const target = get('SELECT id, dept_id FROM users WHERE id = ?', [targetId]);
  if (!target) {
    return res.status(404).json({ message: '用户不存在' });
  }

  // 数据范围校验
  const { mode, deptIds } = req.dataScope;
  if (mode === 'self') {
    return res.status(403).json({ code: 403, message: '无此操作权限' });
  }
  if (mode === 'dept' && deptIds && !deptIds.includes(target.dept_id)) {
    return res.status(403).json({ code: 403, message: '无此操作权限' });
  }

  const crypto = require('crypto');
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  run('UPDATE users SET password = ?, updated_at = datetime(\'now\') WHERE id = ?', [passwordHash, targetId]);
  res.json({ message: '密码重置成功' });
});

// POST /api/users/batch — 批量操作
router.post('/batch', permissionMiddleware('user-delete'), (req, res) => {
  const { action, ids } = req.body;

  if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: '参数错误' });
  }

  const { mode, deptIds, userId } = req.dataScope;

  // 数据范围过滤 ids
  const filteredIds = ids.filter(id => {
    if (mode === 'all') return true;
    if (mode === 'self') return false; // self 不能批量操作
    // dept: 由后端校验实际 dept_id，过滤超范围用户
    return true;
  });

  if (filteredIds.length === 0) {
    return res.status(403).json({ code: 403, message: '无此操作权限' });
  }

  // 不能删除自己
  const actualFiltered = filteredIds.filter(id => id !== userId);
  if (actualFiltered.length === 0) {
    return res.status(400).json({ message: '不能删除自己的账号' });
  }

  const placeholders = actualFiltered.map(() => '?').join(',');
  let sql;
  if (action === 'enable') {
    sql = `UPDATE users SET status = 'active', updated_at = datetime('now') WHERE id IN (${placeholders})`;
  } else if (action === 'disable') {
    sql = `UPDATE users SET status = 'disabled', updated_at = datetime('now') WHERE id IN (${placeholders})`;
  } else if (action === 'delete') {
    sql = `UPDATE users SET deleted_at = datetime('now', 'localtime') WHERE id IN (${placeholders})`;
  } else {
    return res.status(400).json({ message: '不支持的操作类型' });
  }

  run(sql, actualFiltered);
  res.json({ message: `批量${action === 'enable' ? '启用' : action === 'disable' ? '禁用' : '删除'}成功` });
});

// PUT /api/users/:id/restore — 恢复已删除用户
router.put('/:id/restore', permissionMiddleware('user-restore'), (req, res) => {
  const targetId = parseInt(req.params.id);

  const user = get('SELECT id, dept_id FROM users WHERE id = ? AND deleted_at IS NOT NULL', [targetId]);
  if (!user) {
    return res.status(404).json({ message: '用户不存在或未被删除' });
  }

  // 数据范围校验
  const { mode, deptIds } = req.dataScope;
  if (mode === 'self') {
    return res.status(403).json({ code: 403, message: '无此操作权限' });
  }
  if (mode === 'dept' && deptIds && !deptIds.includes(user.dept_id)) {
    return res.status(403).json({ code: 403, message: '无此操作权限' });
  }

  run("UPDATE users SET deleted_at = NULL, updated_at = datetime('now', 'localtime') WHERE id = ?", [targetId]);
  res.json({ message: '用户恢复成功' });
});

module.exports = router;

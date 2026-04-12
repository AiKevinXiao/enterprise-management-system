const express = require('express');
const { all, get, run } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

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

  const totalResult = get(`SELECT COUNT(*) as count FROM users u WHERE ${where}`, params);
  const users = all(
    `SELECT u.*, d.name as dept_name, r.name as role_name
     FROM users u
     LEFT JOIN departments d ON u.dept_id = d.id
     LEFT JOIN roles r ON u.role_id = r.id
     WHERE ${where}
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, parseInt(pageSize), parseInt(offset)]
  );

  res.json({
    list: users,
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

module.exports = router;

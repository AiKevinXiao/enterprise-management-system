const express = require('express');
const { all, get, run } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// 部门列表
router.get('/', async (req, res) => {
  const departments = await all('SELECT * FROM departments WHERE deleted_at IS NULL ORDER BY id');
  res.json({ code: 200, data: departments });
});

// 新增部门
router.post('/', async (req, res) => {
  const { name, code, parent_id, manager, description, location, quota, status } = req.body;
  if (!name) return res.status(400).json({ code: 400, message: '部门名称不能为空' });
  const result = await run(
    'INSERT INTO departments (name, code, parent_id, manager, description, location, quota, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, code || null, parent_id || null, manager || null, description || null, location || null, quota || 0, status || 'active']
  );
  const dept = await get('SELECT * FROM departments WHERE id = ?', [result.lastID]);
  res.json({ code: 200, data: dept });
});

// 更新部门
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, code, parent_id, manager, description, location, quota, status } = req.body;
  const existing = await get('SELECT * FROM departments WHERE id = ? AND deleted_at IS NULL', [id]);
  if (!existing) return res.status(404).json({ code: 404, message: '部门不存在' });
  await run(
    'UPDATE departments SET name=?, code=?, parent_id=?, manager=?, description=?, location=?, quota=?, status=? WHERE id=?',
    [name, code || null, parent_id || null, manager || null, description || null, location || null, quota || 0, status || 'active', id]
  );
  const dept = await get('SELECT * FROM departments WHERE id = ?', [id]);
  res.json({ code: 200, data: dept });
});

// 删除部门（软删除）
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const existing = await get('SELECT * FROM departments WHERE id = ? AND deleted_at IS NULL', [id]);
  if (!existing) return res.status(404).json({ code: 404, message: '部门不存在' });
  await run('UPDATE departments SET deleted_at = NOW() WHERE id = ?', [id]);
  res.json({ code: 200, message: '删除成功' });
});

module.exports = router;

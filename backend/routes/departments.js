const express = require('express');
const { all, get, run } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// 部门列表
router.get('/', async (req, res) => {
  const { deleted } = req.query
  let sql;
  if (deleted === 'true') {
    sql = 'SELECT * FROM departments WHERE deleted_at IS NOT NULL ORDER BY id'
  } else {
    sql = 'SELECT * FROM departments WHERE deleted_at IS NULL ORDER BY id'
  }
  const departments = await all(sql)
  res.json({ code: 200, data: departments })
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

// 批量操作（必须在 /:id 之前定义）
router.put('/batch', async (req, res) => {
  const { action, ids } = req.body;
  if (!ids || !Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ code: 400, message: '请选择要操作的部门' });
  }
  const placeholders = ids.map(() => '?').join(',');
  let sql;
  if (action === 'delete') {
    sql = `UPDATE departments SET deleted_at = NOW() WHERE id IN (${placeholders}) AND deleted_at IS NULL`;
  } else if (action === 'restore') {
    sql = `UPDATE departments SET deleted_at = NULL WHERE id IN (${placeholders}) AND deleted_at IS NOT NULL`;
  } else if (action === 'enable') {
    sql = `UPDATE departments SET status = 'active' WHERE id IN (${placeholders})`;
  } else if (action === 'disable') {
    sql = `UPDATE departments SET status = 'disabled' WHERE id IN (${placeholders})`;
  } else {
    return res.status(400).json({ code: 400, message: '不支持的操作' });
  }
  await run(sql, ids);
  res.json({ code: 200, message: '操作成功' });
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

// 恢复部门
router.put('/:id/restore', async (req, res) => {
  const { id } = req.params;
  const existing = await get('SELECT * FROM departments WHERE id = ? AND deleted_at IS NOT NULL', [id]);
  if (!existing) return res.status(404).json({ code: 404, message: '部门不存在或未被删除' });
  await run('UPDATE departments SET deleted_at = NULL WHERE id = ?', [id]);
  const dept = await get('SELECT * FROM departments WHERE id = ?', [id]);
  res.json({ code: 200, data: dept, message: '恢复成功' });
});

module.exports = router;

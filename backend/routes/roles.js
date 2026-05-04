const express = require('express');
const { all, get, run } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// 获取角色列表
router.get('/', async (req, res) => {
  try {
    const deleted = req.query.deleted;
    let sql;
    if (deleted === 'true') {
      sql = `
        SELECT r.*, 
          (SELECT COUNT(*) FROM users WHERE role_id = r.id AND deleted_at IS NULL) as user_count
        FROM roles r 
        WHERE r.deleted_at IS NOT NULL
        ORDER BY r.id
      `;
    } else {
      sql = `
        SELECT r.*, 
          (SELECT COUNT(*) FROM users WHERE role_id = r.id AND deleted_at IS NULL) as user_count
        FROM roles r 
        WHERE r.deleted_at IS NULL
        ORDER BY r.id
      `;
    }
    const roles = await all(sql);
    res.json({ code: 200, data: roles });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 获取所有权限列表（必须在 /:id 之前）
router.get('/permissions/all', async (req, res) => {
  try {
    const permissions = await all(`
      SELECT * FROM permissions 
      ORDER BY 
        CASE module 
          WHEN '首页' THEN 1 
          WHEN '角色权限' THEN 2 
          WHEN '部门架构' THEN 3 
          WHEN '用户' THEN 4 
          ELSE 99 
        END, id
    `);
    res.json({ code: 200, data: permissions });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 创建角色
router.post('/', async (req, res) => {
  try {
    const { name, code, description, type = 'custom', data_scope = 'self', permission_ids = [] } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({ code: 400, message: '角色名称和编码不能为空' });
    }
    
    // 检查编码是否已存在
    const existing = await get('SELECT id FROM roles WHERE code = ? AND deleted_at IS NULL', [code]);
    if (existing) {
      return res.status(400).json({ code: 400, message: '角色编码已存在' });
    }
    
    const result = await run(
      'INSERT INTO roles (name, code, description, type, data_scope) VALUES (?, ?, ?, ?, ?)',
      [name, code, description, type, data_scope]
    );
    
    const roleId = result.lastID;
    
    // 插入角色权限关联
    if (permission_ids.length > 0) {
      for (const pid of permission_ids) {
        await run('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, pid]);
      }
    }
    
    const role = await get('SELECT * FROM roles WHERE id = ?', [roleId]);
    res.status(201).json({ code: 200, data: role, message: '角色创建成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 获取角色详情（含权限，不区分是否已删除，回收站也需要查看）
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const role = await get('SELECT * FROM roles WHERE id = ?', [id]);
    if (!role) {
      return res.status(404).json({ code: 404, message: '角色不存在' });
    }
    
    // 获取角色的权限
    const perms = await all(`
      SELECT p.* FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
    `, [id]);
    
    role.permissions = perms;
    res.json({ code: 200, data: role });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 更新角色
router.put('/:id', async (req, res) => {
  try {
    const { name, description, type, data_scope, permission_ids, permission_codes } = req.body;
    
    const id = parseInt(req.params.id);
    const role = await get('SELECT * FROM roles WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!role) {
      return res.status(404).json({ code: 404, message: '角色不存在' });
    }
    
    // 系统角色不允许修改类型
    const updateType = role.type === 'system' ? role.type : (type || role.type);
    
    await run(
      'UPDATE roles SET name = ?, description = ?, type = ?, data_scope = ? WHERE id = ?',
      [name || role.name, description || role.description, updateType, data_scope || role.data_scope, id]
    );
    
    // 更新权限关联
    let finalPermIds = permission_ids;
    
    // 如果提供了 permission_codes，转换为 IDs
    if (permission_codes !== undefined && !permission_ids) {
      finalPermIds = [];
      for (const code of permission_codes) {
        const perm = await get('SELECT id FROM permissions WHERE code = ?', [code]);
        if (perm) finalPermIds.push(perm.id);
      }
    }
    
    if (finalPermIds !== undefined) {
      await run('DELETE FROM role_permissions WHERE role_id = ?', [id]);
      for (const pid of finalPermIds) {
        await run('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [id, pid]);
      }
    }
    
    const updatedRole = await get('SELECT * FROM roles WHERE id = ?', [id]);
    res.json({ code: 200, data: updatedRole, message: '角色更新成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 删除角色
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const role = await get('SELECT * FROM roles WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!role) {
      return res.status(404).json({ code: 404, message: '角色不存在' });
    }
    
    // 系统角色不允许删除
    if (role.type === 'system') {
      return res.status(400).json({ code: 400, message: '系统角色不允许删除' });
    }
    
    // 检查是否有用户使用该角色
    const userCount = await get('SELECT COUNT(*) as count FROM users WHERE role_id = ? AND deleted_at IS NULL', [id]);
    if (userCount && userCount.count > 0) {
      return res.status(400).json({ code: 400, message: '该角色下有用户，无法删除' });
    }
    
    // 软删除
    await run('UPDATE roles SET deleted_at = NOW() WHERE id = ?', [id]);
    
    res.json({ code: 200, message: '角色删除成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 恢复已删除角色
router.put('/:id/restore', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const role = await get('SELECT * FROM roles WHERE id = ? AND deleted_at IS NOT NULL', [id]);
    if (!role) {
      return res.status(404).json({ code: 404, message: '角色不存在或未被删除' });
    }
    
    // 检查编码是否被占用
    const existing = await get('SELECT id FROM roles WHERE code = ? AND id != ? AND deleted_at IS NULL', [role.code, id]);
    if (existing) {
      return res.status(400).json({ code: 400, message: '角色编码已被其他角色使用，无法恢复' });
    }
    
    await run('UPDATE roles SET deleted_at = NULL WHERE id = ?', [id]);
    
    const restored = await get('SELECT * FROM roles WHERE id = ?', [id]);
    res.json({ code: 200, data: restored, message: '角色恢复成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 更新角色权限
router.put('/:id/permissions', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { permission_ids } = req.body;
    
    const role = await get('SELECT * FROM roles WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!role) {
      return res.status(404).json({ code: 404, message: '角色不存在' });
    }
    
    // 删除旧权限
    await run('DELETE FROM role_permissions WHERE role_id = ?', [id]);
    
    // 插入新权限
    if (permission_ids && permission_ids.length > 0) {
      for (const pid of permission_ids) {
        await run('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [id, pid]);
      }
    }
    
    res.json({ code: 200, message: '权限更新成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;

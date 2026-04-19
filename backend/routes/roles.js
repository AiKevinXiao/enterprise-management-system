const express = require('express');
const { all, get, run } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// 获取角色列表
router.get('/', (req, res) => {
  try {
    const roles = all(`
      SELECT r.*, 
        (SELECT COUNT(*) FROM users WHERE role_id = r.id AND (deleted_at IS NULL OR deleted_at = "")) as user_count
      FROM roles r 
      WHERE r.deleted_at IS NULL OR r.deleted_at = ""
      ORDER BY r.id
    `);
    res.json({ code: 200, data: roles });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 获取所有权限列表（必须在 /:id 之前）
router.get('/permissions/all', (req, res) => {
  try {
    const permissions = all('SELECT * FROM permissions ORDER BY module, id');
    res.json({ code: 200, data: permissions });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 创建角色
router.post('/', (req, res) => {
  try {
    const { name, code, description, type = 'custom', data_scope = 'self', permission_ids = [] } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({ code: 400, message: '角色名称和编码不能为空' });
    }
    
    // 检查编码是否已存在
    const existing = get('SELECT id FROM roles WHERE code = ? AND (deleted_at IS NULL OR deleted_at = "")', [code]);
    if (existing) {
      return res.status(400).json({ code: 400, message: '角色编码已存在' });
    }
    
    const result = run(
      'INSERT INTO roles (name, code, description, type, data_scope) VALUES (?, ?, ?, ?, ?)',
      [name, code, description, type, data_scope]
    );
    
    const roleId = result.lastID;
    
    // 插入角色权限关联
    if (permission_ids.length > 0) {
      permission_ids.forEach(pid => {
        run('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, pid]);
      });
    }
    
    const role = get('SELECT * FROM roles WHERE id = ?', [roleId]);
    res.json({ code: 200, data: role, message: '角色创建成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 获取角色详情（含权限）
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const role = get('SELECT * FROM roles WHERE id = ? AND (deleted_at IS NULL OR deleted_at = "")', [id]);
    if (!role) {
      return res.status(404).json({ code: 404, message: '角色不存在' });
    }
    
    // 获取角色的权限
    const perms = all(`
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
router.put('/:id', (req, res) => {
  try {
    const { name, description, type, data_scope, permission_ids, permission_codes } = req.body;
    
    const id = parseInt(req.params.id);
    const role = get('SELECT * FROM roles WHERE id = ? AND (deleted_at IS NULL OR deleted_at = "")', [id]);
    if (!role) {
      return res.status(404).json({ code: 404, message: '角色不存在' });
    }
    
    // 系统角色不允许修改类型
    const updateType = role.type === 'system' ? role.type : (type || role.type);
    
    run(
      'UPDATE roles SET name = ?, description = ?, type = ?, data_scope = ? WHERE id = ?',
      [name || role.name, description || role.description, updateType, data_scope || role.data_scope, id]
    );
    
    // 更新权限关联
    let finalPermIds = permission_ids;
    
    // 如果提供了 permission_codes，转换为 IDs
    if (permission_codes !== undefined && !permission_ids) {
      finalPermIds = [];
      permission_codes.forEach(code => {
        const perm = get('SELECT id FROM permissions WHERE code = ?', [code]);
        if (perm) finalPermIds.push(perm.id);
      });
    }
    
    if (finalPermIds !== undefined) {
      run('DELETE FROM role_permissions WHERE role_id = ?', [id]);
      finalPermIds.forEach(pid => {
        run('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [id, pid]);
      });
    }
    
    const updatedRole = get('SELECT * FROM roles WHERE id = ?', [id]);
    res.json({ code: 200, data: updatedRole, message: '角色更新成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 删除角色
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const role = get('SELECT * FROM roles WHERE id = ? AND (deleted_at IS NULL OR deleted_at = "")', [id]);
    if (!role) {
      return res.status(404).json({ code: 404, message: '角色不存在' });
    }
    
    // 系统角色不允许删除
    if (role.type === 'system') {
      return res.status(400).json({ code: 400, message: '系统角色不允许删除' });
    }
    
    // 检查是否有用户使用该角色
    const userCount = get('SELECT COUNT(*) as count FROM users WHERE role_id = ? AND (deleted_at IS NULL OR deleted_at = "")', [id]);
    if (userCount && userCount.count > 0) {
      return res.status(400).json({ code: 400, message: '该角色下有用户，无法删除' });
    }
    
    // 软删除
    run('UPDATE roles SET deleted_at = datetime("now") WHERE id = ?', [id]);
    run('DELETE FROM role_permissions WHERE role_id = ?', [id]);
    
    res.json({ code: 200, message: '角色删除成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 更新角色权限
router.put('/:id/permissions', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { permission_ids } = req.body;
    
    const role = get('SELECT * FROM roles WHERE id = ? AND (deleted_at IS NULL OR deleted_at = "")', [id]);
    if (!role) {
      return res.status(404).json({ code: 404, message: '角色不存在' });
    }
    
    // 删除旧权限
    run('DELETE FROM role_permissions WHERE role_id = ?', [id]);
    
    // 插入新权限
    if (permission_ids && permission_ids.length > 0) {
      permission_ids.forEach(pid => {
        run('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [id, pid]);
      });
    }
    
    res.json({ code: 200, message: '权限更新成功' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;

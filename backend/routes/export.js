/**
 * Excel 导出路由
 * GET /api/export/users
 * GET /api/export/departments
 * GET /api/export/roles
 */
const express = require('express');
const { all, get } = require('../db');
const { exportToExcel } = require('../utils/excel');
const { authMiddleware, permissionMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// 导出用户
router.get('/users', permissionMiddleware('user-view'), async (req, res) => {
  try {
    const users = await all(`
      SELECT u.id, u.username, u.name, u.email, u.phone,
             d.name as dept_name, d.id as dept_id,
             r.name as role_name, r.id as role_id,
             u.status, u.created_at, u.updated_at
      FROM users u
      LEFT JOIN departments d ON u.dept_id = d.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.deleted_at IS NULL
      ORDER BY u.id
    `);

    const data = users.map(u => ({
      用户ID: u.id,
      用户名: u.username,
      姓名: u.name,
      邮箱: u.email,
      手机号: u.phone,
      部门ID: u.dept_id,
      部门名称: u.dept_name,
      角色ID: u.role_id,
      角色名称: u.role_name,
      状态: u.status,
      创建时间: u.created_at,
      更新时间: u.updated_at,
    }));

    const buffer = exportToExcel(data, '用户列表');
    const filename = `用户列表_${Date.now()}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Export users error:', err);
    res.status(500).json({ message: '导出失败' });
  }
});

// 导出部门
router.get('/departments', permissionMiddleware('dept-view'), async (req, res) => {
  try {
    const depts = await all(`
      SELECT d.id, d.name, d.code, d.parent_id,
             p.name as parent_name,
             d.manager, d.description, d.location, d.quota, d.status,
             d.created_at, d.updated_at
      FROM departments d
      LEFT JOIN departments p ON d.parent_id = p.id
      WHERE d.deleted_at IS NULL
      ORDER BY d.id
    `);

    const data = depts.map(d => ({
      部门ID: d.id,
      部门名称: d.name,
      部门编码: d.code,
      上级部门ID: d.parent_id,
      上级部门名称: d.parent_name,
      负责人: d.manager,
      描述: d.description,
      地点: d.location,
      编制: d.quota,
      状态: d.status,
      创建时间: d.created_at,
      更新时间: d.updated_at,
    }));

    const buffer = exportToExcel(data, '部门列表');
    const filename = `部门列表_${Date.now()}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Export departments error:', err);
    res.status(500).json({ message: '导出失败' });
  }
});

// 导出角色
router.get('/roles', permissionMiddleware('role-view'), async (req, res) => {
  try {
    const roles = await all(`
      SELECT r.id, r.name, r.code, r.description, r.type,
             r.data_scope,
             (SELECT COUNT(*) FROM users WHERE role_id = r.id AND deleted_at IS NULL) as user_count,
             r.created_at, r.updated_at
      FROM roles r
      WHERE r.deleted_at IS NULL
      ORDER BY r.id
    `);

    const data = roles.map(r => ({
      角色ID: r.id,
      角色名称: r.name,
      角色编码: r.code,
      描述: r.description,
      类型: r.type,
      数据范围: r.data_scope,
      用户数: r.user_count,
      创建时间: r.created_at,
      更新时间: r.updated_at,
    }));

    const buffer = exportToExcel(data, '角色列表');
    const filename = `角色列表_${Date.now()}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Export roles error:', err);
    res.status(500).json({ message: '导出失败' });
  }
});

module.exports = router;

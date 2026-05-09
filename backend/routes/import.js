/**
 * Excel 批量导入路由
 * POST /api/import/users
 * POST /api/import/departments
 * POST /api/import/roles
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { all, get, run } = require('../db');
const { parseExcel } = require('../utils/excel');
const { authMiddleware, permissionMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ─── multer 配置：上传到 uploads 目录 ─────────────────────────────────────────
const upload = multer({
  dest: path.join(__dirname, '../uploads'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 限制 5MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 .xlsx 或 .xls 文件'));
    }
  }
});

// ─── 工具函数 ───────────────────────────────────────────────────────────────

/** 清理上传文件（成功后删除） */
function cleanupFile(filepath) {
  try { if (filepath && fs.existsSync(filepath)) fs.unlinkSync(filepath); } catch (_) {}
}

/** 校验必填字段 */
function requireFields(row, fields) {
  const missing = fields.filter(f => !row[f] && row[f] !== 0);
  return missing.length === 0 ? null : missing;
}

/** 清理字符串空格 */
function trim(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

// ─── 导入用户 ────────────────────────────────────────────────────────────────
router.post('/users', upload.single('file'), permissionMiddleware('user-create'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: '请上传 Excel 文件' });

    let rows;
    try {
      rows = parseExcel(fs.readFileSync(file.path));
    } catch (e) {
      cleanupFile(file.path);
      return res.status(400).json({ message: '文件格式错误，无法解析' });
    }
    cleanupFile(file.path);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: 'Excel 中没有数据' });
    }

    // 预查部门和角色映射（dept_name→id, role_name→id）
    const depts = await all('SELECT id, name FROM departments WHERE deleted_at IS NULL');
    const deptMap = new Map(depts.map(d => [d.name.trim(), d.id]));
    const roles = await all('SELECT id, name FROM roles WHERE deleted_at IS NULL');
    const roleMap = new Map(roles.map(r => [r.name.trim(), r.id]));

    const success = [], errors = [], existSkip = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel 行号（从2开始，第1行是表头）

      // 必填校验
      const missing = requireFields(row, ['用户名', '姓名']);
      if (missing) {
        errors.push({ row: rowNum, 错误: `缺少必填字段: ${missing.join(', ')}` });
        continue;
      }

      const username = trim(row['用户名']);
      const name = trim(row['姓名']);
      const password = trim(row['密码']);

      if (!username || !name) {
        errors.push({ row: rowNum, 错误: '用户名、姓名不能为空' });
        continue;
      }
      if (password && password.length < 8) {
        errors.push({ row: rowNum, 错误: '密码长度不能少于8位' });
        continue;
      }

      // 检查用户名是否已存在
      const exist = await get('SELECT id FROM users WHERE username = ?', [username]);
      if (exist) {
        existSkip.push({ row: rowNum, 用户名: username, 原因: '用户名已存在，跳过' });
        continue;
      }

      // 部门/角色映射
      const deptName = trim(row['部门名称']);
      const roleName = trim(row['角色名称']);
      const deptId = deptName ? deptMap.get(deptName) || null : null;
      const roleId = roleName ? roleMap.get(roleName) || null : null;

      const email = trim(row['邮箱']);
      const phone = trim(row['手机号']);
      const status = (trim(row['状态']) || 'active').toLowerCase() === '禁用' ? 'disabled' : 'active';

      // 密码加密（未提供密码时使用默认密码）
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync(password || '123456', 10);

      const result = await run(
        `INSERT INTO users (username, password, name, email, phone, dept_id, role_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [username, hash, name, email, phone, deptId, roleId, status]
      );

      success.push({ row: rowNum, 用户名: username, 姓名: name, 新ID: result.lastID });
    }

    res.json({
      message: `导入完成：成功 ${success.length} 条，跳过 ${existSkip.length} 条，错误 ${errors.length} 条`,
      success,
      existSkip,
      errors,
    });
  } catch (err) {
    console.error('Import users error:', err);
    res.status(500).json({ message: '服务器错误: ' + err.message });
  }
});

// ─── 导入部门 ────────────────────────────────────────────────────────────────
router.post('/departments', upload.single('file'), permissionMiddleware('dept-create'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: '请上传 Excel 文件' });

    let rows;
    try {
      rows = parseExcel(fs.readFileSync(file.path));
    } catch (e) {
      cleanupFile(file.path);
      return res.status(400).json({ message: '文件格式错误，无法解析' });
    }
    cleanupFile(file.path);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: 'Excel 中没有数据' });
    }

    const success = [], errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const name = trim(row['部门名称']);
      if (!name) {
        errors.push({ row: rowNum, 错误: '部门名称不能为空' });
        continue;
      }

      const code = trim(row['部门编码']);
      // 检查编码唯一性
      if (code) {
        const exist = await get('SELECT id FROM departments WHERE code = ? AND deleted_at IS NULL', [code]);
        if (exist) {
          errors.push({ row: rowNum, 部门名称: name, 原因: '部门编码已存在' });
          continue;
        }
      }

      const parentName = trim(row['上级部门名称']);
      const parentId = parentName ? (await get('SELECT id FROM departments WHERE name = ? AND deleted_at IS NULL', [parentName]))?.id || null : null;

      const manager = trim(row['负责人']);
      const description = trim(row['描述']);
      const location = trim(row['地点']);
      const quota = parseInt(row['编制']) || 0;
      const status = (trim(row['状态']) || 'active').toLowerCase() === '禁用' ? 'disabled' : 'active';

      const result = await run(
        `INSERT INTO departments (name, code, parent_id, manager, description, location, quota, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, code, parentId, manager, description, location, quota, status]
      );

      success.push({ row: rowNum, 部门名称: name, 新ID: result.lastID });
    }

    res.json({
      message: `导入完成：成功 ${success.length} 条，错误 ${errors.length} 条`,
      success,
      errors,
    });
  } catch (err) {
    console.error('Import departments error:', err);
    res.status(500).json({ message: '服务器错误: ' + err.message });
  }
});

// ─── 导入角色 ────────────────────────────────────────────────────────────────
router.post('/roles', upload.single('file'), permissionMiddleware('role-create'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: '请上传 Excel 文件' });

    let rows;
    try {
      rows = parseExcel(fs.readFileSync(file.path));
    } catch (e) {
      cleanupFile(file.path);
      return res.status(400).json({ message: '文件格式错误，无法解析' });
    }
    cleanupFile(file.path);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: 'Excel 中没有数据' });
    }

    const success = [], errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const name = trim(row['角色名称']);
      const code = trim(row['角色编码']);
      if (!name || !code) {
        errors.push({ row: rowNum, 错误: '角色名称和角色编码不能为空' });
        continue;
      }

      // 检查唯一性
      const exist = await get('SELECT id FROM roles WHERE (name = ? OR code = ?) AND deleted_at IS NULL', [name, code]);
      if (exist) {
        errors.push({ row: rowNum, 角色名称: name, 原因: '角色名称或编码已存在' });
        continue;
      }

      const description = trim(row['描述']);
      const type = (trim(row['类型']) || 'custom') === '系统内置' ? 'system' : 'custom';
      const dataScope = trim(row['数据范围']) || 'self';

      const result = await run(
        `INSERT INTO roles (name, code, description, type, data_scope) VALUES (?, ?, ?, ?, ?)`,
        [name, code, description, type, dataScope]
      );

      success.push({ row: rowNum, 角色名称: name, 新ID: result.lastID });
    }

    res.json({
      message: `导入完成：成功 ${success.length} 条，错误 ${errors.length} 条`,
      success,
      errors,
    });
  } catch (err) {
    console.error('Import roles error:', err);
    res.status(500).json({ message: '服务器错误: ' + err.message });
  }
});

module.exports = router;
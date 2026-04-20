const jwt = require('jsonwebtoken');
const { all } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'ems-secret-key-2026';
const JWT_EXPIRES_IN = '24h';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录或登录已过期' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
  }

  req.user = decoded;
  next();
}

/**
 * 递归获取 deptId 的所有子部门 ID（包括自己）
 */
function getSubDeptIds(deptId) {
  const result = all('SELECT id FROM departments WHERE parent_id = ?', [deptId]);
  const ids = [deptId];
  result.forEach(d => {
    ids.push(...getSubDeptIds(d.id));
  });
  return [...new Set(ids)];
}

/**
 * 数据范围中间件
 * 注入 req.dataScope = { mode, deptIds, userId }
 *   mode:    'all' | 'dept' | 'self'
 *   deptIds: number[]  当前用户可访问的部门ID列表（含自己）
 *   userId:  number    当前用户ID
 */
function dataScopeMiddleware(req, res, next) {
  const { data_scope, dept_id, id } = req.user;
  const mode = data_scope || 'self';

  if (mode === 'all') {
    req.dataScope = { mode: 'all', deptIds: null, userId: id };
  } else if (mode === 'dept') {
    req.dataScope = { mode: 'dept', deptIds: getSubDeptIds(dept_id), userId: id };
  } else {
    // self: 仅本人数据
    req.dataScope = { mode: 'self', deptIds: [dept_id], userId: id };
  }

  next();
}

/**
 * 权限校验中间件
 * 用法：router.post('/', authMiddleware, permissionMiddleware('user-create'), handler)
 */
function permissionMiddleware(code) {
  return (req, res, next) => {
    const perms = req.user.permissions || [];
    if (!perms.includes(code)) {
      return res.status(403).json({ code: 403, message: '无此操作权限' });
    }
    next();
  };
}

module.exports = { generateToken, verifyToken, authMiddleware, permissionMiddleware, dataScopeMiddleware, getSubDeptIds, JWT_SECRET };

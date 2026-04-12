const jwt = require('jsonwebtoken');

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

module.exports = { generateToken, verifyToken, authMiddleware, JWT_SECRET };

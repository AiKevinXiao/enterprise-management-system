const express = require('express');
const { all, get, run } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/stats', (req, res) => {
  const totalUsers = get('SELECT COUNT(*) as count FROM users');
  const activeUsers = get('SELECT COUNT(*) as count FROM users WHERE status = \'active\'');
  const totalDepts = get('SELECT COUNT(*) as count FROM departments');
  const recentLogs = all('SELECT * FROM login_logs ORDER BY created_at DESC LIMIT 5');

  res.json({
    totalUsers: totalUsers ? totalUsers.count : 0,
    activeUsers: activeUsers ? activeUsers.count : 0,
    totalDepts: totalDepts ? totalDepts.count : 0,
    recentLogs
  });
});

module.exports = router;

const express = require('express');
const { all, get, run } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await get('SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL');
    const activeUsers = await get(
      'SELECT COUNT(DISTINCT username) as count FROM login_logs WHERE success = 1 AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );
    const totalDepts = await get('SELECT COUNT(*) as count FROM departments WHERE deleted_at IS NULL');
    const recentLogs = await all('SELECT * FROM login_logs ORDER BY created_at DESC LIMIT 5');

    res.json({
      totalUsers: totalUsers ? totalUsers.count : 0,
      activeUsers: activeUsers ? activeUsers.count : 0,
      totalDepts: totalDepts ? totalDepts.count : 0,
      recentLogs
    });
  } catch (err) {
    console.error('GET /dashboard/stats error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;

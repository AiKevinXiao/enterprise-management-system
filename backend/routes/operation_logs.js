const express = require('express');
const { all, get } = require('../db');
const { authMiddleware, permissionMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// 获取操作日志列表（分页 + 筛选）
router.get('/', permissionMiddleware('log-view'), async (req, res) => {
  try {
    const { module, action, username, start_date, end_date, page = 1, pageSize = 20 } = req.query;
    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const offset = (pageNum - 1) * pageSizeNum;

    let where = 'WHERE 1=1';
    const params = [];

    if (module) {
      where += ' AND module = ?';
      params.push(module);
    }
    if (action) {
      where += ' AND action = ?';
      params.push(action);
    }
    if (username) {
      where += ' AND username LIKE ?';
      params.push(`%${username}%`);
    }
    if (start_date) {
      where += ' AND created_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      where += ' AND created_at <= ?';
      params.push(end_date + ' 23:59:59');
    }

    // 总数
    const countSql = `SELECT COUNT(*) as total FROM operation_logs ${where}`;
    const countResult = await get(countSql, params);
    const total = countResult ? countResult.total : 0;

    // 分页数据（使用字符串拼接避免 LIMIT/OFFSET prepared statement 兼容问题）
    const dataSql = `SELECT * FROM operation_logs ${where} ORDER BY created_at DESC LIMIT ${pageSizeNum} OFFSET ${offset}`;
    const rows = await all(dataSql, params);

    res.json({
      code: 200,
      data: rows,
      total,
      page: pageNum,
      pageSize: pageSizeNum
    });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

// 获取操作日志统计（按模块/操作类型分组）
router.get('/stats', permissionMiddleware('log-view'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let where = 'WHERE 1=1';
    const params = [];
    if (start_date) {
      where += ' AND created_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      where += ' AND created_at <= ?';
      params.push(end_date + ' 23:59:59');
    }

    // 按模块统计
    const moduleStats = await all(
      `SELECT module, COUNT(*) as count FROM operation_logs ${where} GROUP BY module ORDER BY count DESC`,
      params
    );

    // 按操作类型统计
    const actionStats = await all(
      `SELECT action, COUNT(*) as count FROM operation_logs ${where} GROUP BY action ORDER BY count DESC`,
      params
    );

    // 最近7天每日操作数
    const dailyStats = await all(
      `SELECT DATE(created_at) as date, COUNT(*) as count FROM operation_logs ${where} AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY date`,
      params
    );

    res.json({ code: 200, data: { moduleStats, actionStats, dailyStats } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message });
  }
});

module.exports = router;

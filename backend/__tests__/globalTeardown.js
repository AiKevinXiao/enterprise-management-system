/**
 * globalTeardown — 关闭测试进程的数据库连接池
 */
const { getPool } = require('../db');

module.exports = async () => {
  try {
    const pool = await getPool();
    if (pool && pool.end) {
      await pool.end();
      console.log('[Jest] DB pool closed');
    }
  } catch (_) {
    // ignore
  }
};
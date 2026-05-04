/**
 * Jest 全局 teardown — 测试结束后关闭连接池
 */
const { getPool } = require('../db');

module.exports = async () => {
  const pool = await getPool();
  if (pool && pool.end) {
    await pool.end();
  }
};

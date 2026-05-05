/**
 * globalTeardown — 全量清理测试数据 + 关闭数据库连接池
 *
 * 种子数据 id 范围（由 seedData() 初始化，测试运行前已存在）：
 *   roles        : 1 ~ 3   (超级管理员 / 部门经理 / 普通用户)
 *   users        : 1 ~ 5
 *   departments  : 1 ~ 8
 *
 * 清理策略：删除所有 id > 种子最大值的记录
 *   - 关联表（role_permissions、login_logs）按外键级联删除，无需单独处理
 *   - departments、users、roles 只保留 id 在种子范围内的
 */
const { getPool } = require('../db');

module.exports = async () => {
  try {
    const pool = await getPool();

    // 等待后端所有写入落盘
    await new Promise(r => setTimeout(r, 500));

    // 1. 清理 departments（保留 id 1-8）
    await pool.query(`DELETE FROM departments WHERE id > 8`);

    // 2. 清理 users（保留 id 1-5）
    await pool.query(`DELETE FROM users WHERE id > 5`);

    // 3. 清理 roles（保留 id 1-3）
    await pool.query(`DELETE FROM role_permissions WHERE role_id > 3`);
    await pool.query(`UPDATE roles SET deleted_at = NULL WHERE id <= 3`);
    await pool.query(`DELETE FROM roles WHERE id > 3`);

    // 4. 重置 login_logs（全部清空）
    await pool.query(`DELETE FROM login_logs`);

    // 5. 关闭连接池
    if (pool && pool.end) {
      await pool.end();
    }

    console.log('[Jest] Test data cleaned up and DB pool closed');
  } catch (err) {
    console.error('[Jest] Cleanup error:', err.message);
  }
};
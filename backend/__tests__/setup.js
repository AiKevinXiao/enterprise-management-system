/**
 * Jest 全局 setup — 在所有测试之前初始化数据库连接
 */
const { initDB } = require('../db');

module.exports = async () => {
  await initDB();
};

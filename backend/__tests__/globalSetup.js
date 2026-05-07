/**
 * globalSetup — 等待后端 HTTP 服务就绪，并初始化数据库连接池
 * 后端通过 `node app.js` 启动（已在另一个进程），这里只确认服务可用
 * 并调用 initDB() 确保 db.js 中的 pool 在测试进程中已初始化
 */
const http = require('http');
const { initDB } = require('../db');

module.exports = async () => {
  // 等待后端 HTTP 服务就绪（最多 10s）
  const maxWait = 10000;
  const step = 500;
  let waited = 0;

  while (waited < maxWait) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3000/api/health', res => {
          resolve(res);
        });
        req.on('error', reject);
        req.setTimeout(500, () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });
      console.log('[Jest] Backend is ready at http://localhost:3000');
      break;
    } catch (_) {
      await new Promise(r => setTimeout(r, step));
      waited += step;
    }
  }

  // 初始化本测试进程的数据库连接池（与后端共用同一 MySQL）
  await initDB();
  console.log('[Jest] DB pool initialized in test process');
};
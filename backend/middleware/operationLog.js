const { run } = require('../db');

/**
 * 操作日志记录中间件
 * 用法：在路由处理成功后调用 res._logOperation() 或直接在路由中间件中使用
 */

/**
 * 记录操作日志
 * @param {Object} options - { module, action, targetId, targetName, detail, req }
 */
async function logOperation({ module, action, targetId, targetName, detail, req }) {
  try {
    const user = req.user || {};
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.ip || null;
    const detailStr = detail ? JSON.stringify(detail) : null;

    await run(
      'INSERT INTO operation_logs (user_id, username, module, action, target_id, target_name, detail, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [user.id || null, user.username || null, module, action, targetId || null, targetName || null, detailStr, ip]
    );
  } catch (err) {
    console.error('Failed to log operation:', err.message);
  }
}

/**
 * 请求级别的操作日志中间件
 * 在路由中使用，会在响应发送后自动记录日志
 * @param {string} module - 操作模块
 * @param {string} action - 操作类型
 * @param {Function} getTarget - (req, res) => { targetId, targetName, detail }
 */
function operationLogMiddleware(module, action, getTarget) {
  return (req, res, next) => {
    // 劫持 res.json 来拦截成功响应
    const originalJson = res.json.bind(res);
    res.json = function (data) {
      // 只在成功时记录日志
      const isSuccess = data && (data.code === 200 || data.code === 201);
      if (isSuccess && typeof getTarget === 'function') {
        try {
          const target = getTarget(req, data);
          if (target) {
            logOperation({
              module,
              action,
              targetId: target.targetId,
              targetName: target.targetName,
              detail: target.detail,
              req
            });
          }
        } catch (err) {
          console.error('Operation log middleware error:', err.message);
        }
      }
      return originalJson(data);
    };
    next();
  };
}

module.exports = { logOperation, operationLogMiddleware };

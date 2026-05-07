/**
 * 测试辅助工具 — 统一提供 app 实例、认证 token、常用断言
 */
const request = require('supertest');
const app = require('../app');

/** 获取 admin 的 JWT token */
async function getAdminToken() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  return res.body.token;
}

/** 创建一个辅助请求，自带 Bearer token */
function authGet(token, path) {
  return request(app).get(path).set('Authorization', `Bearer ${token}`);
}
function authPost(token, path, body) {
  return request(app).post(path).set('Authorization', `Bearer ${token}`).send(body);
}
function authPut(token, path, body) {
  return request(app).put(path).set('Authorization', `Bearer ${token}`).send(body);
}
function authDel(token, path) {
  return request(app).delete(path).set('Authorization', `Bearer ${token}`);
}

/** 生成唯一时间戳前缀 */
function ts() {
  return Date.now();
}

module.exports = { app, request, getAdminToken, authGet, authPost, authPut, authDel, ts };

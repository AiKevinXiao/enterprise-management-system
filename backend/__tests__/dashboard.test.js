/**
 * 仪表盘模块测试
 * 覆盖：统计数据接口
 */
const { getAdminToken, authGet } = require('./helpers');
const request = require('supertest');
const app = require('../app');

describe('DASHBOARD 仪表盘模块', () => {
  let token;

  beforeAll(async () => {
    token = await getAdminToken();
  });

  describe('GET /api/dashboard/stats', () => {
    test('获取统计数据', async () => {
      const res = await authGet(token, '/api/dashboard/stats');
      expect(res.status).toBe(200);
      expect(typeof res.body.totalUsers).toBe('number');
      expect(typeof res.body.activeUsers).toBe('number');
      expect(typeof res.body.totalDepts).toBe('number');
      expect(Array.isArray(res.body.recentLogs)).toBe(true);
    });

    test('用户数大于 0', async () => {
      const res = await authGet(token, '/api/dashboard/stats');
      expect(res.body.totalUsers).toBeGreaterThan(0);
    });

    test('部门数大于 0', async () => {
      const res = await authGet(token, '/api/dashboard/stats');
      expect(res.body.totalDepts).toBeGreaterThan(0);
    });

    test('未认证请求返回 401', async () => {
      const res = await request(app).get('/api/dashboard/stats');
      expect(res.status).toBe(401);
    });
  });
});

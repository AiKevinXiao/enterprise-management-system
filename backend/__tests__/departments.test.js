/**
 * 部门模块测试
 * 覆盖：列表查询
 */
const { getAdminToken, authGet } = require('./helpers');

describe('DEPARTMENTS 部门模块', () => {
  let token;

  beforeAll(async () => {
    token = await getAdminToken();
  });

  describe('GET /api/departments', () => {
    test('获取部门列表', async () => {
      const res = await authGet(token, '/api/departments');
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(8);
    });

    test('部门数据结构包含必要字段', async () => {
      const res = await authGet(token, '/api/departments');
      const dept = res.body.data[0];
      expect(dept.id).toBeDefined();
      expect(dept.name).toBeDefined();
      expect(dept.code).toBeDefined();
    });

    test('未认证请求返回 401', async () => {
      const res = await require('supertest')(require('../app')).get('/api/departments');
      expect(res.status).toBe(401);
    });
  });
});

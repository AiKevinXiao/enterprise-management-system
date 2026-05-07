/**
 * 认证模块测试
 * 覆盖：登录成功、登录失败、Token 校验、/me 接口、退出
 */
const request = require('supertest');
const app = require('../app');

describe('AUTH 认证模块', () => {
  describe('POST /api/auth/login', () => {
    test('管理员登录成功', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toBe('admin');
      expect(res.body.user.permissions).toContain('user-view');
    });

    test('缺少用户名或密码返回 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBeDefined();
    });

    test('密码错误返回 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });

    test('不存在的用户返回 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexist', password: 'Test@1234' });

      expect(res.status).toBe(401);
    });

    test('被禁用账号返回 403', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'wangwu', password: '123456' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('禁用');
    });

    test('待激活账号返回 403', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'zhaoliu', password: '123456' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('激活');
    });
  });

  describe('GET /api/auth/me', () => {
    let token;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });
      token = res.body.token;
    });

    test('携带有效 Token 获取当前用户', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.username).toBe('admin');
      expect(res.body.permissions).toBeDefined();
    });

    test('不携带 Token 返回 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    test('携带无效 Token 返回 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    test('退出登录返回成功', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('成功');
    });
  });
});

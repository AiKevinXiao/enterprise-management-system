const request = require('supertest');
const { initDB } = require('../db');

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  await initDB();
});

describe('受保护资源', () => {
  const app = require('../app');

  test('无Token访问用户列表', async () => {
    const res = await request(app)
      .get('/api/users');

    expect(res.status).toBe(401);
  });

  test('有Token访问用户列表', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    const token = loginRes.body.token;

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.list).toBeDefined();
    expect(res.body.total).toBeGreaterThan(0);
  });

  test('有Token访问仪表盘统计', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    const token = loginRes.body.token;

    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalUsers).toBeDefined();
    expect(res.body.activeUsers).toBeDefined();
  });

  test('健康检查', async () => {
    const res = await request(app)
      .get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

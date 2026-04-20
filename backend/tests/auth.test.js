const request = require('supertest');
const { initDB, run, all, get } = require('../db');

const ORIGINAL_ENV = process.env;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  await initDB();
  // 重置登录失败计数，避免历史测试锁定账号
  const { run } = require('../db');
  run('DELETE FROM login_logs WHERE 1=1');
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('POST /api/auth/login', () => {
  const app = require('../app');

  test('正常登录 - admin', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe('admin');
    expect(res.body.user.name).toBe('管理员');
    expect(res.body.user.role.code).toBe('admin');
  });

  test('正常登录 - zhangsan', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'zhangsan', password: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe('zhangsan');
  });

  test('空用户名', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: '', password: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('用户名');
  });

  test('空密码', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: '' });

    expect(res.status).toBe(400);
  });

  test('不存在的用户', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: '123456' });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('错误');
  });

  test('密码错误', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.attempts).toBeDefined();
  });

  test('禁用账号登录', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'wangwu', password: '123456' });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('禁用');
  });

  test('待激活账号登录', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'zhaoliu', password: '123456' });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('激活');
  });
});

describe('GET /api/auth/me', () => {
  const app = require('../app');

  test('无Token访问', async () => {
    const res = await request(app)
      .get('/api/auth/me');

    expect(res.status).toBe(401);
  });

  test('有效Token访问', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    const token = loginRes.body.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.username).toBe('admin');
    expect(res.body.permissions).toBeDefined();
    expect(res.body.permissions.length).toBeGreaterThan(0);
  });

  test('无效Token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalidtoken');

    expect(res.status).toBe(401);
  });
});

describe('暴力破解防护', () => {
  const app = require('../app');

  test('连续5次错误密码后锁定', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'lisi', password: 'wrongpassword' });
    }

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'lisi', password: 'wrongpassword' });

    expect(res.status).toBe(423);
    expect(res.body.locked).toBe(true);
  });
});

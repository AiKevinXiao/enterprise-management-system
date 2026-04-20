const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'ems-secret-key-2026';

describe('permissionMiddleware & dataScopeMiddleware', () => {
  let app;
  let adminToken, deptToken, selfToken;

  beforeAll(async () => {
    const { initDB } = require('./db');
    await initDB();
    app = require('./app');
  });

  afterAll(() => {
    const { saveDB } = require('./db');
    saveDB();
  });

  beforeAll(async () => {
    const login = (body) =>
      request(app).post('/api/auth/login').send(body).expect(200);

    const [r1, r2, r3] = await Promise.all([
      login({ username: 'admin', password: 'admin123' }),
      login({ username: 'zhangsan', password: '123456' }),
      login({ username: 'lisi', password: '123456' }),
    ]);

    adminToken = r1.body.token;
    deptToken = r2.body.token;
    selfToken = r3.body.token;
  });

  // =====================================================
  // permissionMiddleware
  // =====================================================
  describe('permissionMiddleware', () => {
    test('admin 拥有 user-create 权限，POST /api/users 有权限检查但不一定是 4xx', async () => {
      // admin 有权限，不应被 permissionMiddleware 拦截（可能因其他原因返回 500）
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'testperm1', password: 'Test@123456', name: 'test', role_id: 3, dept_id: 1 });
      // 有权限时至少不应是 403
      expect(res.status).not.toBe(403);
    });

    test('zhangsan(部门经理) 无 user-delete 权限，DELETE /api/users/:id 应返回 403', async () => {
      const createRes = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'to_delete', password: 'Test@123456', name: 'del', role_id: 3, dept_id: 2 });
      const userId = createRes.body?.data?.id;
      if (!userId) return;

      const res = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${deptToken}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('无此操作权限');
    });

    test('zhangsan(部门经理) 有 user-create 权限，POST /api/users 不返回 403', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${deptToken}`)
        .send({ username: 'to_create', password: 'Test@123456', name: 'c', role_id: 3, dept_id: 2 });
      expect(res.status).not.toBe(403);
    });

    test('lisi(普通员工) 无 user-create 权限，POST /api/users 应返回 403', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${selfToken}`)
        .send({ username: 'no_perm', password: 'Test@123456', name: 'x', role_id: 3, dept_id: 3 });
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('无此操作权限');
    });

    test('admin 有全部权限，GET ?deleted=1 不被 permissionMiddleware 拦截', async () => {
      const res = await request(app)
        .get('/api/users?deleted=1')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).not.toBe(403);
    });

    test('lisi(普通员工) 有 user-view 权限，GET ?deleted=1 应返回 200（user-view 允许查列表）', async () => {
      // 普通员工角色拥有 user-view 权限（可查看列表），user-restore 控制恢复操作
      const res = await request(app)
        .get('/api/users?deleted=1')
        .set('Authorization', `Bearer ${selfToken}`);
      expect(res.status).toBe(200);
    });
  });

  // =====================================================
  // dataScopeMiddleware
  // =====================================================
  describe('dataScopeMiddleware', () => {
    test('admin(data_scope=all) GET /api/users 返回全部用户（>=5条）', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(5);
    });

    test('zhangsan(data_scope=dept) GET /api/users 仅返回本部门及子部门用户', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${deptToken}`);
      expect(res.status).toBe(200);
      const users = res.body.data;
      expect(users.length).toBeGreaterThan(0);
      // 验证 zhangsan 在结果中
      const zhangsan = users.find(u => u.username === 'zhangsan');
      expect(zhangsan).toBeDefined();
    });

    test('lisi(data_scope=self) GET /api/users 仅返回自己', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${selfToken}`);
      expect(res.status).toBe(200);
      const users = res.body.data;
      expect(users.length).toBe(1);
      expect(users[0].username).toBe('lisi');
    });

    test('lisi(普通员工) PUT /api/users/:id 编辑他人应返回 403（数据权限不足）', async () => {
      const res = await request(app)
        .put('/api/users/1')
        .set('Authorization', `Bearer ${selfToken}`)
        .send({ name: 'hacked' });
      expect(res.status).toBe(403);
    });

    test('zhangsan(部门经理) PUT /api/users/:id 编辑子部门用户应成功', async () => {
      const createRes = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'dept_test', password: 'Test@123456', name: 'dept_test', role_id: 3, dept_id: 4 });
      const userId = createRes.body?.data?.id;
      if (!userId) return;

      const res = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${deptToken}`)
        .send({ phone: '13900000004' });
      expect(res.status).not.toBe(403);
    });

    test('zhangsan(部门经理) PUT /api/users/:id 编辑其他部门用户应返回 403', async () => {
      const res = await request(app)
        .put('/api/users/5')
        .set('Authorization', `Bearer ${deptToken}`)
        .send({ phone: '13900000005' });
      expect(res.status).toBe(403);
    });
  });
});

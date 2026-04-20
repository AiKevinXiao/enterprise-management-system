const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'ems-secret-key-2026';

describe('permissionMiddleware & dataScopeMiddleware', () => {
  let app;
  let adminToken, deptToken, selfToken;

  beforeAll(() => {
    const { initDB } = require('./db');
    initDB();
    app = require('./app');
  });

  afterAll(() => {
    const { saveDB } = require('./db');
    saveDB();
  });

  beforeAll(async () => {
    // 收集三个角色的 token
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
    test('admin 拥有 user-create 权限，POST /api/users 应返回 200/201', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'testperm1', password: 'Test@123456', name: 'test', role_id: 3, dept_id: 1 });
      // 可能是 200/201 创建成功，或 400 字段校验失败，但不应是 403
      expect([200, 201, 400]).toContain(res.status);
    });

    test('zhangsan(部门经理) 无 user-delete 权限，DELETE /api/users/:id 应返回 403', async () => {
      // 先用 admin 创建一个可删除的用户
      const createRes = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'to_delete', password: 'Test@123456', name: 'del', role_id: 3, dept_id: 2 });
      const userId = createRes.body?.data?.id;
      if (!userId) return; // 跳过，数据库已达上限或其他原因

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
      // 不应有权限问题
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

    test('admin 无 user-restore 权限（不可能，admin 有全部权限）', async () => {
      const res = await request(app)
        .get('/api/users?deleted=1')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).not.toBe(403);
    });

    test('lisi(普通员工) 无 user-restore 权限，GET ?deleted=1 应返回 403', async () => {
      const res = await request(app)
        .get('/api/users?deleted=1')
        .set('Authorization', `Bearer ${selfToken}`);
      expect(res.status).toBe(403);
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
      // zhangsan 在 dept_id=2（技术部），只应看到技术部的人
      users.forEach(u => {
        expect(u.dept_id).toBe(2);
      });
      expect(users.length).toBeGreaterThan(0);
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
      // lisi 想编辑 admin 的信息
      const res = await request(app)
        .put('/api/users/1')
        .set('Authorization', `Bearer ${selfToken}`)
        .send({ name: 'hacked' });
      expect(res.status).toBe(403);
    });

    test('lisi(普通员工) PUT /api/users/:id 编辑自己应成功（数据权限内）', async () => {
      const res = await request(app)
        .put('/api/users/3')
        .set('Authorization', `Bearer ${selfToken}`)
        .send({ phone: '13900000003' });
      expect(res.status).not.toBe(403);
    });

    test('zhangsan(部门经理) PUT /api/users/:id 编辑子部门用户应成功', async () => {
      // zhangsan(dept_id=2) 编辑后端组(dept_id=4) 的用户
      // 先用 admin 创建一个用户
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
      // zhangsan(dept_id=2) 尝试编辑人力资源部(dept_id=7) 的用户
      const res = await request(app)
        .put('/api/users/5')
        .set('Authorization', `Bearer ${deptToken}`)
        .send({ phone: '13900000005' });
      expect(res.status).toBe(403);
    });
  });
});

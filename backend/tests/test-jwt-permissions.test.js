const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'ems-secret-key-2026';

describe('JWT Payload & 登录接口', () => {
  let app;

  beforeAll(() => {
    // 动态引入 app，避免在所有测试前就 initDB
    const { initDB } = require('../db');
    initDB();
    app = require('../app');
  });

  afterAll(() => {
    const { saveDB } = require('../db');
    saveDB();
  });

  // --- 辅助：登录并返回 decoded token ---
  async function loginAs(username, password = 'admin123') {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username, password })
      .expect(200);

    const token = res.body.token;
    expect(token).toBeTruthy();
    return jwt.decode(token);
  }

  // --- 辅助：用 token 发请求 ---
  async function get(path, token) {
    return request(app)
      .get(path)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  }

  // =====================================================
  // 超级管理员（admin）
  // =====================================================
  test('admin: token 包含 dept_id、data_scope、permissions', async () => {
    const payload = await loginAs('admin');
    expect(payload.dept_id).toBe(1);
    expect(payload.data_scope).toBe('all');
    expect(Array.isArray(payload.permissions)).toBe(true);
  });

  test('admin: 拥有全部 15 条权限', async () => {
    const payload = await loginAs('admin');
    const expected = [
      'view-dashboard',
      'user-view', 'user-create', 'user-edit', 'user-delete', 'user-reset-pwd', 'user-restore',
      'dept-view', 'dept-create', 'dept-edit', 'dept-delete',
      'role-view', 'role-create', 'role-edit', 'role-delete',
    ];
    expected.forEach(code => {
      expect(payload.permissions).toContain(code);
    });
    expect(payload.permissions).toHaveLength(15);
  });

  test('admin: 登录响应 user.permissions 与 token 一致', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(200);

    expect(Array.isArray(res.body.user.permissions)).toBe(true);
    expect(res.body.user.permissions).toHaveLength(15);
    expect(res.body.user.role.data_scope).toBe('all');
    expect(res.body.user.dept.id).toBe(1);
  });

  // =====================================================
  // 部门经理（zhangsan）
  // =====================================================
  test('zhangsan: dept_id=2, data_scope=dept, 8条权限', async () => {
    const payload = await loginAs('zhangsan', '123456');
    expect(payload.dept_id).toBe(2);
    expect(payload.data_scope).toBe('dept');

    const expected = [
      'view-dashboard',
      'user-view', 'user-create', 'user-edit',
      'dept-view', 'dept-create', 'dept-edit',
      'role-view',
    ];
    expected.forEach(code => {
      expect(payload.permissions).toContain(code);
    });

    // 无删除/重置/恢复权限
    expect(payload.permissions).not.toContain('user-delete');
    expect(payload.permissions).not.toContain('user-reset-pwd');
    expect(payload.permissions).not.toContain('user-restore');
    expect(payload.permissions).not.toContain('dept-delete');
    expect(payload.permissions).not.toContain('role-create');
    expect(payload.permissions).not.toContain('role-edit');
    expect(payload.permissions).not.toContain('role-delete');
    expect(payload.permissions).toHaveLength(8);
  });

  // =====================================================
  // 普通员工（lisi）
  // =====================================================
  test('lisi: dept_id=3, data_scope=self, 3条权限', async () => {
    const payload = await loginAs('lisi', '123456');
    expect(payload.dept_id).toBe(3);
    expect(payload.data_scope).toBe('self');

    const expected = ['view-dashboard', 'user-view', 'dept-view'];
    expected.forEach(code => {
      expect(payload.permissions).toContain(code);
    });

    // 无任何写权限
    expect(payload.permissions).not.toContain('user-create');
    expect(payload.permissions).not.toContain('user-edit');
    expect(payload.permissions).not.toContain('user-delete');
    expect(payload.permissions).not.toContain('user-reset-pwd');
    expect(payload.permissions).not.toContain('user-restore');
    expect(payload.permissions).not.toContain('dept-create');
    expect(payload.permissions).not.toContain('dept-edit');
    expect(payload.permissions).not.toContain('dept-delete');
    expect(payload.permissions).not.toContain('role-view');  // 普通员工无 role-view
    expect(payload.permissions).toHaveLength(3);
  });

  // =====================================================
  // 边界情况
  // =====================================================
  test('登录失败时 token 为空，不暴露 payload', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong' })
      .expect(401);

    expect(res.body.token).toBeUndefined();
  });

  test('无 token 访问受保护接口返回 401', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  test('伪造 token 签名返回 401', async () => {
    const fakeToken = jwt.sign({ id: 1 }, 'wrong-secret');
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${fakeToken}`);
    expect(res.status).toBe(401);
  });

  test('token payload 中 permissions 为只读副本，不被外部修改影响', async () => {
    const payload = await loginAs('admin');
    const originalLen = payload.permissions.length;
    payload.permissions.push('fake-perm');  // 尝试篡改
    expect(payload.permissions).toHaveLength(originalLen + 1); // 本地副本被改了

    // 再次登录验证数据库中的值未被影响
    const payload2 = await loginAs('admin');
    expect(payload2.permissions).toHaveLength(originalLen);   // 数据库值不变
    expect(payload2.permissions).not.toContain('fake-perm');
  });

  test('/me 接口返回的 permissions 与 token 一致', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(200);

    const token = res.body.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(meRes.body.permissions).toEqual(res.body.user.permissions);
  });
});

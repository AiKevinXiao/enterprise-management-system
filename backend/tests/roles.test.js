const request = require('supertest');
const { initDB, run, get } = require('../db');

const ORIGINAL_ENV = process.env;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  await initDB();
  run('DELETE FROM login_logs WHERE 1=1');
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

// 辅助函数：获取管理员 Token
async function getAdminToken(app) {
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  return loginRes.body.token;
}

// 辅助函数：清理测试数据
async function cleanupTestRole(code) {
  try {
    run('DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE code = ?)', [code]);
    run('UPDATE roles SET deleted_at = NULL WHERE code = ?', [code]);
    run('DELETE FROM roles WHERE code = ?', [code]);
  } catch (e) {
    // ignore
  }
}

describe('角色 API 集成测试', () => {
  const app = require('../app');

  // 测试用的角色编码
  const TEST_ROLE_CODE = 'test_role_unit_' + Date.now();

  afterAll(async () => {
    await cleanupTestRole(TEST_ROLE_CODE);
  });

  describe('GET /api/roles - 获取角色列表', () => {
    test('无 Token 访问应返回 401', async () => {
      const res = await request(app).get('/api/roles');
      expect(res.status).toBe(401);
    });

    test('有 Token 应返回角色列表', async () => {
      const token = await getAdminToken(app);
      const res = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      // 应该有超级管理员、部门经理、普通员工三个默认角色
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('GET /api/roles/permissions/all - 获取权限列表', () => {
    test('有 Token 应返回权限列表', async () => {
      const token = await getAdminToken(app);
      const res = await request(app)
        .get('/api/roles/permissions/all')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(15); // 15个权限
    });
  });

  describe('GET /api/roles/:id - 获取角色详情', () => {
    test('获取超级管理员详情', async () => {
      const token = await getAdminToken(app);
      const res = await request(app)
        .get('/api/roles/1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data.id).toBe(1);
      expect(res.body.data.name).toBe('超级管理员');
      expect(res.body.data.code).toBe('admin');
      expect(res.body.data.permissions).toBeDefined();
    });

    test('不存在的角色应返回 404', async () => {
      const token = await getAdminToken(app);
      const res = await request(app)
        .get('/api/roles/99999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(404);
      expect(res.body.message).toContain('不存在');
    });
  });

  describe('POST /api/roles - 创建角色', () => {
    test('创建新角色', async () => {
      const token = await getAdminToken(app);
      const res = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '测试角色',
          code: TEST_ROLE_CODE,
          description: '单元测试创建的角色',
          type: 'custom',
          data_scope: 'self',
          permission_ids: [1, 2] // 查看首页、查看用户
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data.name).toBe('测试角色');
      expect(res.body.data.code).toBe(TEST_ROLE_CODE);
    });

    test('重复编码应返回 400', async () => {
      const token = await getAdminToken(app);
      const res = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '重复角色',
          code: 'admin', // 已存在的编码
          description: '测试'
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
      expect(res.body.message).toContain('已存在');
    });

    test('缺少必填字段应返回 400', async () => {
      const token = await getAdminToken(app);
      const res = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '测试角色',
          // 缺少 code
          description: '测试'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/roles/:id - 更新角色', () => {
    test('更新角色信息', async () => {
      const token = await getAdminToken(app);

      // 先创建角色
      const createRes = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '待更新角色',
          code: TEST_ROLE_CODE + '_update',
          description: '更新前描述'
        });

      const roleId = createRes.body.data.id;

      // 更新角色
      const updateRes = await request(app)
        .put(`/api/roles/${roleId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '已更新角色',
          description: '更新后描述',
          data_scope: 'dept'
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.code).toBe(200);
      expect(updateRes.body.data.name).toBe('已更新角色');
      expect(updateRes.body.data.description).toBe('更新后描述');

      // 清理
      run('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
      run('DELETE FROM roles WHERE id = ?', [roleId]);
    });

    test('更新不存在的角色应返回 404', async () => {
      const token = await getAdminToken(app);
      const res = await request(app)
        .put('/api/roles/99999')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '不存在' });

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/roles/:id/permissions - 更新角色权限', () => {
    test('更新角色权限', async () => {
      const token = await getAdminToken(app);

      // 先创建角色
      const createRes = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '权限测试角色',
          code: TEST_ROLE_CODE + '_perms',
          description: '测试权限',
          permission_ids: [1]
        });

      const roleId = createRes.body.data.id;

      // 更新权限
      const updateRes = await request(app)
        .put(`/api/roles/${roleId}/permissions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          permission_ids: [1, 2, 3, 4]
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.code).toBe(200);

      // 验证权限已更新
      const roleRes = await request(app)
        .get(`/api/roles/${roleId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(roleRes.body.data.permissions.length).toBe(4);

      // 清理
      run('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
      run('DELETE FROM roles WHERE id = ?', [roleId]);
    });
  });

  describe('DELETE /api/roles/:id - 删除角色', () => {
    test('删除角色（软删除）', async () => {
      const token = await getAdminToken(app);

      // 先创建角色
      const createRes = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '待删除角色',
          code: TEST_ROLE_CODE + '_delete',
          description: '测试删除'
        });

      const roleId = createRes.body.data.id;

      // 删除角色
      const deleteRes = await request(app)
        .delete(`/api/roles/${roleId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.code).toBe(200);

      // 验证角色已被软删除
      const getRes = await request(app)
        .get(`/api/roles/${roleId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.status).toBe(404);

      // 清理测试数据
      run('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
      run('DELETE FROM roles WHERE id = ?', [roleId]);
    });

    test('系统角色不允许删除', async () => {
      const token = await getAdminToken(app);
      const res = await request(app)
        .delete('/api/roles/1') // 超级管理员是系统角色
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('系统角色');
    });

    test('删除不存在的角色应返回 404', async () => {
      const token = await getAdminToken(app);
      const res = await request(app)
        .delete('/api/roles/99999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});


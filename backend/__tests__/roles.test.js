/**
 * 角色模块测试
 * 覆盖：列表、详情、创建、更新、软删除、恢复、权限管理
 */
const { getAdminToken, authGet, authPost, authPut, authDel, ts } = require('./helpers');

describe('ROLES 角色模块', () => {
  let token;

  beforeAll(async () => {
    token = await getAdminToken();
  });

  describe('GET /api/roles', () => {
    test('获取角色列表', async () => {
      const res = await authGet(token, '/api/roles');
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });

    test('获取已删除角色列表', async () => {
      const res = await authGet(token, '/api/roles?deleted=true');
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/roles/permissions/all', () => {
    test('获取全部权限列表', async () => {
      const res = await authGet(token, '/api/roles/permissions/all');
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(16);
    });
  });

  describe('POST /api/roles', () => {
    test('创建角色成功返回 201', async () => {
      const res = await authPost(token, '/api/roles', {
        name: '测试' + ts(),
        code: 'test_' + ts(),
        description: 'Jest测试创建',
        type: 'custom',
        data_scope: 'self'
      });
      expect(res.status).toBe(201);
      expect(res.body.code).toBe(200);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.message).toContain('成功');
    });

    test('缺少名称或编码返回 400', async () => {
      const res = await authPost(token, '/api/roles', { name: '无编码角色' });
      expect(res.status).toBe(400);
    });

    test('重复编码返回 400', async () => {
      const res = await authPost(token, '/api/roles', { name: '重复', code: 'admin' });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('已存在');
    });
  });

  describe('GET /api/roles/:id', () => {
    test('获取角色详情含权限', async () => {
      const res = await authGet(token, '/api/roles/1');
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data.name).toBeDefined();
      expect(Array.isArray(res.body.data.permissions)).toBe(true);
    });

    test('不存在的角色返回 404', async () => {
      const res = await authGet(token, '/api/roles/99999');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/roles/:id', () => {
    test('更新角色名称', async () => {
      // 先创建一个角色
      const created = await authPost(token, '/api/roles', {
        name: '待修改' + ts(),
        code: 'edit_' + ts(),
        type: 'custom',
        data_scope: 'self'
      });
      const roleId = created.body.data.id;

      const res = await authPut(token, `/api/roles/${roleId}`, {
        name: '已修改' + ts(),
        description: '更新后的描述'
      });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('成功');
    });
  });

  describe('DELETE /api/roles/:id + PUT restore', () => {
    let roleId;

    beforeEach(async () => {
      const created = await authPost(token, '/api/roles', {
        name: '待删除' + ts(),
        code: 'del_' + ts(),
        type: 'custom',
        data_scope: 'self'
      });
      roleId = created.body.data.id;
    });

    test('软删除自定义角色', async () => {
      const res = await authDel(token, `/api/roles/${roleId}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('成功');
    });

    test('系统角色不允许删除', async () => {
      const res = await authDel(token, '/api/roles/1');
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('系统');
    });

    test('恢复已删除角色', async () => {
      await authDel(token, `/api/roles/${roleId}`);
      const res = await authPut(token, `/api/roles/${roleId}/restore`, {});
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('成功');
    });
  });

  describe('PUT /api/roles/:id/permissions', () => {
    test('更新角色权限', async () => {
      // 创建一个临时角色来测试权限更新，不修改 seed 角色
      const created = await authPost(token, '/api/roles', {
        name: '权限测试' + ts(),
        code: 'permtest_' + ts(),
        type: 'custom',
        data_scope: 'self'
      });
      const roleId = created.body.data.id;

      const res = await authPut(token, `/api/roles/${roleId}/permissions`, {
        permission_ids: [1, 2, 8]
      });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('成功');

      // 验证权限已更新
      const detail = await authGet(token, `/api/roles/${roleId}`);
      expect(detail.body.data.permissions.length).toBe(3);
    });
  });
});

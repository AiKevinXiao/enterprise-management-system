/**
 * 用户模块测试
 * 覆盖：列表、详情、创建、更新、软删除、恢复、密码重置、批量操作、分页搜索
 */
const { getAdminToken, authGet, authPost, authPut, authDel, ts } = require('./helpers');
const request = require('supertest');
const app = require('../app');

describe('USERS 用户模块', () => {
  let token;

  beforeAll(async () => {
    token = await getAdminToken();
  });

  describe('GET /api/users', () => {
    test('获取用户列表（分页）', async () => {
      const res = await authGet(token, '/api/users');
      expect(res.status).toBe(200);
      expect(res.body.total).toBeGreaterThanOrEqual(5);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('分页参数生效', async () => {
      const res = await authGet(token, '/api/users?page=1&pageSize=2');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.page).toBe(1);
      expect(res.body.pageSize).toBe(2);
    });

    test('关键字搜索', async () => {
      const res = await authGet(token, '/api/users?keyword=admin');
      expect(res.status).toBe(200);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    test('查看已删除用户列表', async () => {
      const res = await authGet(token, '/api/users?deleted=1');
      expect(res.status).toBe(200);
    });

    test('未认证请求返回 401', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/users', () => {
    test('创建用户成功返回 201', async () => {
      const res = await authPost(token, '/api/users', {
        username: 'jest_' + ts(),
        password: 'Test@1234',
        name: 'Jest测试用户',
        email: 'jest@ems.com',
        phone: '139' + ts(),
        dept_id: 2,
        role_id: 3,
        status: 'active'
      });
      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.message).toContain('成功');
    });

    test('缺少必填字段返回 400', async () => {
      const res = await authPost(token, '/api/users', { username: 'no_pwd' });
      expect(res.status).toBe(400);
    });

    test('密码复杂度不足返回 400', async () => {
      const res = await authPost(token, '/api/users', {
        username: 'weakpwd_' + ts(),
        password: '123',
        name: '弱密码用户'
      });
      expect(res.status).toBe(400);
    });

    test('重复用户名返回 400', async () => {
      const res = await authPost(token, '/api/users', {
        username: 'admin',
        password: 'Test@1234',
        name: '重复'
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('已存在');
    });
  });

  describe('GET /api/users/:id', () => {
    test('获取用户详情', async () => {
      const res = await authGet(token, '/api/users/1');
      expect(res.status).toBe(200);
      expect(res.body.username).toBe('admin');
    });

    test('不存在的用户返回 404', async () => {
      const res = await authGet(token, '/api/users/99999');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/users/:id', () => {
    let userId;

    beforeEach(async () => {
      const created = await authPost(token, '/api/users', {
        username: 'edit_' + ts(),
        password: 'Test@1234',
        name: '待编辑用户',
        dept_id: 2,
        role_id: 3,
        status: 'active'
      });
      userId = created.body.data.id;
    });

    test('更新用户信息', async () => {
      const res = await authPut(token, `/api/users/${userId}`, {
        name: '编辑后名字',
        email: 'updated@ems.com',
        phone: '13899999999',
        dept_id: 3,
        role_id: 3,
        status: 'active'
      });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('成功');
    });

    test('更新不存在的用户返回 404', async () => {
      const res = await authPut(token, '/api/users/99999', { name: '不存在' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/users/:id', () => {
    test('软删除用户', async () => {
      const created = await authPost(token, '/api/users', {
        username: 'del_' + ts(),
        password: 'Test@1234',
        name: '待删除用户',
        dept_id: 2,
        role_id: 3,
        status: 'active'
      });
      const userId = created.body.data.id;

      const res = await authDel(token, `/api/users/${userId}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('成功');
    });

    test('删除不存在的用户返回 404', async () => {
      const res = await authDel(token, '/api/users/99999');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/users/:id/reset-password', () => {
    let userId;

    beforeAll(async () => {
      const created = await authPost(token, '/api/users', {
        username: 'resetpwd_' + ts(),
        password: 'Test@1234',
        name: '待重置密码用户',
        dept_id: 2,
        role_id: 3,
        status: 'active'
      });
      userId = created.body.data.id;
    });

    test('重置密码成功', async () => {
      const res = await authPut(token, `/api/users/${userId}/reset-password`, {
        password: 'NewPass@123'
      });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('成功');
    });

    test('新密码复杂度不足返回 400', async () => {
      const res = await authPut(token, `/api/users/${userId}/reset-password`, {
        password: '123'
      });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/users/:id/restore', () => {
    test('恢复已删除用户', async () => {
      const created = await authPost(token, '/api/users', {
        username: 'restore_' + ts(),
        password: 'Test@1234',
        name: '待恢复用户',
        dept_id: 2,
        role_id: 3,
        status: 'active'
      });
      const userId = created.body.data.id;

      await authDel(token, `/api/users/${userId}`);

      const res = await authPut(token, `/api/users/${userId}/restore`, {});
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('成功');
    });
  });

  describe('POST /api/users/batch', () => {
    let uid1, uid2;

    beforeAll(async () => {
      const t = ts();
      const c1 = await authPost(token, '/api/users', {
        username: 'batch1_' + t,
        password: 'Test@1234',
        name: '批量1',
        dept_id: 2,
        role_id: 3,
        status: 'active'
      });
      const c2 = await authPost(token, '/api/users', {
        username: 'batch2_' + t,
        password: 'Test@1234',
        name: '批量2',
        dept_id: 2,
        role_id: 3,
        status: 'active'
      });
      uid1 = c1.body.data.id;
      uid2 = c2.body.data.id;
    });

    test('批量启用', async () => {
      const res = await authPost(token, '/api/users/batch', {
        action: 'enable',
        ids: [uid1]
      });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('成功');
    });

    test('批量禁用', async () => {
      const res = await authPost(token, '/api/users/batch', {
        action: 'disable',
        ids: [uid1]
      });
      expect(res.status).toBe(200);
    });

    test('批量删除', async () => {
      const res = await authPost(token, '/api/users/batch', {
        action: 'delete',
        ids: [uid1, uid2]
      });
      expect(res.status).toBe(200);
    });

    test('参数错误返回 400', async () => {
      const res = await authPost(token, '/api/users/batch', {});
      expect(res.status).toBe(400);
    });
  });
});

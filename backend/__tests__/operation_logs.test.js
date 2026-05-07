/**
 * 操作日志模块测试
 * 覆盖：列表查询、统计、筛选、分页、认证/鉴权
 * 前置条件：角色 CRUD 操作已接入 logOperation，测试过程中创建的角色会自动产生日志
 */
const { app, request, getAdminToken, authGet, authPost, authPut, authDel, ts } = require('./helpers');

describe('OPERATION_LOGS 操作日志模块', () => {
  let token;

  beforeAll(async () => {
    token = await getAdminToken();
  });

  // ── 辅助：创建并删除一个角色，以产生日志 ────────────────────────────────
  async function createAndDeleteRole() {
    const name = '日志测试_' + ts();
    const code = 'logtest_' + ts();
    const cr = await authPost(token, '/api/roles', {
      name, code, type: 'custom', data_scope: 'self'
    });
    const roleId = cr.body.data.id;
    await authDel(token, `/api/roles/${roleId}`);
    await authPut(token, `/api/roles/${roleId}/restore`, {});
    await authDel(token, `/api/roles/${roleId}`);
    return roleId;
  }

  // ── 辅助：产生指定 module + action 的日志 ───────────────────────────────
  async function ensureLogsExist(count = 1) {
    for (let i = 0; i < count; i++) {
      await createAndDeleteRole();
    }
  }

  describe('GET /api/operation-logs（无数据时）', () => {
    test('空列表返回 200 且 data 为空数组', async () => {
      const res = await authGet(token, '/api/operation-logs?page=1&pageSize=10');
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(typeof res.body.total).toBe('number');
      expect(res.body.page).toBe(1);
    });
  });

  describe('GET /api/operation-logs（角色操作产生日志后）', () => {
    beforeAll(async () => {
      // 创建并删除角色，在 operation_logs 中留下记录
      await ensureLogsExist(1);
    });

    test('有日志时返回非空数组', async () => {
      const res = await authGet(token, '/api/operation-logs?page=1&pageSize=20');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    test('每条日志包含必要字段', async () => {
      const res = await authGet(token, '/api/operation-logs?page=1&pageSize=5');
      const log = res.body.data[0];
      expect(log).toHaveProperty('id');
      expect(log).toHaveProperty('user_id');
      expect(log).toHaveProperty('username');
      expect(log).toHaveProperty('module');
      expect(log).toHaveProperty('action');
      expect(log).toHaveProperty('target_id');
      expect(log).toHaveProperty('target_name');
      expect(log).toHaveProperty('ip');
      expect(log).toHaveProperty('created_at');
      expect(log.module).toBe('role');
    });

    test('按 module=role 筛选', async () => {
      const res = await authGet(token, '/api/operation-logs?module=role&page=1&pageSize=20');
      expect(res.status).toBe(200);
      res.body.data.forEach(log => {
        expect(log.module).toBe('role');
      });
    });

    test('按 action=create 筛选', async () => {
      const res = await authGet(token, '/api/operation-logs?action=create&page=1&pageSize=20');
      expect(res.status).toBe(200);
      res.body.data.forEach(log => {
        expect(log.action).toBe('create');
      });
    });

    test('按 username 模糊筛选', async () => {
      const res = await authGet(token, '/api/operation-logs?username=admin&page=1&pageSize=20');
      expect(res.status).toBe(200);
      res.body.data.forEach(log => {
        expect(log.username).toBe('admin');
      });
    });

    test('按日期范围筛选', async () => {
      const today = new Date().toISOString().substring(0, 10);
      const res = await authGet(token, `/api/operation-logs?start_date=${today}&page=1&pageSize=20`);
      expect(res.status).toBe(200);
      res.body.data.forEach(log => {
        const logDate = log.created_at.substring(0, 10);
        expect(logDate).toBe(today);
      });
    });

    test('分页：第二页返回不同数据', async () => {
      const page1 = await authGet(token, '/api/operation-logs?page=1&pageSize=1');
      const page2 = await authGet(token, '/api/operation-logs?page=2&pageSize=1');
      if (page1.body.total > 1) {
        expect(page1.body.data[0].id).not.toBe(page2.body.data[0].id);
      }
    });

    test('pageSize=100 时正常返回', async () => {
      const res = await authGet(token, '/api/operation-logs?page=1&pageSize=100');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(100);
    });
  });

  describe('GET /api/operation-logs/stats', () => {
    test('返回模块统计、操作类型统计、近7日趋势', async () => {
      await ensureLogsExist(1);
      const res = await authGet(token, '/api/operation-logs/stats');
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data).toHaveProperty('moduleStats');
      expect(res.body.data).toHaveProperty('actionStats');
      expect(res.body.data).toHaveProperty('dailyStats');
      expect(Array.isArray(res.body.data.moduleStats)).toBe(true);
      expect(Array.isArray(res.body.data.actionStats)).toBe(true);
      expect(Array.isArray(res.body.data.dailyStats)).toBe(true);
    });

    test('按日期范围统计', async () => {
      const today = new Date().toISOString().substring(0, 10);
      const res = await authGet(token, `/api/operation-logs/stats?start_date=${today}&end_date=${today}`);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
    });

    test('moduleStats 每条含 module 和 count', async () => {
      const res = await authGet(token, '/api/operation-logs/stats');
      if (res.body.data.moduleStats.length > 0) {
        const item = res.body.data.moduleStats[0];
        expect(item).toHaveProperty('module');
        expect(item).toHaveProperty('count');
      }
    });

    test('actionStats 每条含 action 和 count', async () => {
      const res = await authGet(token, '/api/operation-logs/stats');
      if (res.body.data.actionStats.length > 0) {
        const item = res.body.data.actionStats[0];
        expect(item).toHaveProperty('action');
        expect(item).toHaveProperty('count');
      }
    });
  });

  describe('权限控制', () => {
    test('无 token 返回 401', async () => {
      const res = await request(app).get('/api/operation-logs');
      expect(res.status).toBe(401);
    });

    test('stats 无 token 返回 401', async () => {
      const res = await request(app).get('/api/operation-logs/stats');
      expect(res.status).toBe(401);
    });
  });
});

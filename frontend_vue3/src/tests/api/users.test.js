import { describe, it, expect, beforeEach, vi } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import api from '../../api/request.js'

vi.mock('../../router', () => ({
  default: { push: vi.fn(), replace: vi.fn(), currentRoute: { value: { path: '/' } } }
}))

const mock = new MockAdapter(api)

describe('API - Users 用户模块', () => {
  beforeEach(() => {
    mock.reset()
    localStorage.clear()
  })

  it('获取用户列表返回分页数据', async () => {
    const mockData = {
      success: true,
      data: [
        { id: 1, username: 'admin', realname: '管理员', status: 1 },
        { id: 2, username: 'zhangsan', realname: '张三', status: 1 }
      ],
      total: 2,
      page: 1,
      pageSize: 10
    }
    mock.onGet('/users').reply(200, mockData)

    const res = await api.get('/users')
    expect(res.success).toBe(true)
    expect(res.data).toHaveLength(2)
    expect(res.total).toBe(2)
  })

  it('创建用户成功', async () => {
    mock.onPost('/users').reply(200, {
      success: true,
      message: '用户创建成功',
      data: { id: 10, username: 'newuser' }
    })

    const res = await api.post('/users', {
      username: 'newuser',
      password: 'Admin@123',
      realname: '新用户',
      dept_id: 1,
      role_id: 2
    })
    expect(res.success).toBe(true)
    expect(res.data.id).toBe(10)
  })

  it('更新用户成功', async () => {
    mock.onPut('/users/1').reply(200, {
      success: true,
      message: '用户更新成功'
    })

    const res = await api.put('/users/1', { realname: '更新后的姓名' })
    expect(res.success).toBe(true)
  })

  it('删除用户成功（软删除）', async () => {
    mock.onDelete('/users/1').reply(200, {
      success: true,
      message: '用户删除成功'
    })

    const res = await api.delete('/users/1')
    expect(res.success).toBe(true)
  })

  it('恢复用户成功', async () => {
    mock.onPut('/users/1/restore').reply(200, {
      success: true,
      message: '用户恢复成功'
    })

    const res = await api.put('/users/1/restore')
    expect(res.success).toBe(true)
  })

  it('重置密码成功', async () => {
    mock.onPut('/users/1/reset-password').reply(200, {
      success: true,
      message: '密码重置成功'
    })

    const res = await api.put('/users/1/reset-password', { password: 'NewPass@123' })
    expect(res.success).toBe(true)
  })

  it('批量操作成功', async () => {
    mock.onPost('/users/batch').reply(200, {
      success: true,
      message: '批量操作成功',
      data: { affected: 3 }
    })

    const res = await api.post('/users/batch', { action: 'delete', ids: [1, 2, 3] })
    expect(res.success).toBe(true)
    expect(res.data.affected).toBe(3)
  })
})
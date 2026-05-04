import { describe, it, expect, beforeEach, vi } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import api from '../../api/request.js'

vi.mock('../../router', () => ({
  default: { push: vi.fn(), replace: vi.fn(), currentRoute: { value: { path: '/' } } }
}))

const mock = new MockAdapter(api)

describe('API - Roles 角色模块', () => {
  beforeEach(() => {
    mock.reset()
    localStorage.clear()
  })

  it('获取角色列表', async () => {
    const mockData = {
      success: true,
      data: [
        { id: 1, name: '管理员', data_scope: 'all' },
        { id: 2, name: '普通用户', data_scope: 'self' }
      ],
      total: 2
    }
    mock.onGet('/roles').reply(200, mockData)

    const res = await api.get('/roles')
    expect(res.success).toBe(true)
    expect(res.data).toHaveLength(2)
  })

  it('获取单个角色', async () => {
    mock.onGet('/roles/1').reply(200, {
      success: true,
      data: { id: 1, name: '管理员', description: '系统管理员', data_scope: 'all' }
    })

    const res = await api.get('/roles/1')
    expect(res.success).toBe(true)
    expect(res.data.name).toBe('管理员')
  })

  it('创建角色成功', async () => {
    mock.onPost('/roles').reply(200, {
      success: true,
      data: { id: 10, name: '测试角色' }
    })

    const res = await api.post('/roles', {
      name: '测试角色',
      description: '测试用',
      data_scope: 'dept'
    })
    expect(res.success).toBe(true)
    expect(res.data.id).toBe(10)
  })

  it('更新角色成功', async () => {
    mock.onPut('/roles/1').reply(200, { success: true })

    const res = await api.put('/roles/1', { name: '超级管理员', description: '最高权限' })
    expect(res.success).toBe(true)
  })

  it('删除角色成功（软删除）', async () => {
    mock.onDelete('/roles/1').reply(200, { success: true })

    const res = await api.delete('/roles/1')
    expect(res.success).toBe(true)
  })

  it('恢复角色成功', async () => {
    mock.onPut('/roles/1/restore').reply(200, { success: true })

    const res = await api.put('/roles/1/restore')
    expect(res.success).toBe(true)
  })

  it('获取全部权限列表', async () => {
    const permissions = [
      { id: 1, code: 'user-view', name: '查看用户' },
      { id: 2, code: 'user-create', name: '创建用户' }
    ]
    mock.onGet('/roles/permissions/all').reply(200, { success: true, data: permissions })

    const res = await api.get('/roles/permissions/all')
    expect(res.success).toBe(true)
    expect(res.data).toHaveLength(2)
  })

  it('更新角色权限成功', async () => {
    mock.onPut('/roles/1/permissions').reply(200, { success: true })

    const res = await api.put('/roles/1/permissions', { permission_ids: [1, 2, 3] })
    expect(res.success).toBe(true)
  })
})
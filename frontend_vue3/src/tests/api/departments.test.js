import { describe, it, expect, beforeEach, vi } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import api from '../../api/request.js'

vi.mock('../../router', () => ({
  default: { push: vi.fn(), replace: vi.fn(), currentRoute: { value: { path: '/' } } }
}))

const mock = new MockAdapter(api)

describe('API - Departments 部门模块', () => {
  beforeEach(() => {
    mock.reset()
    localStorage.clear()
  })

  it('获取部门列表', async () => {
    const mockData = [
      { id: 1, name: '技术部', parent_id: 0 },
      { id: 2, name: '前端组', parent_id: 1 }
    ]
    mock.onGet('/departments').reply(200, { success: true, data: mockData })

    const res = await api.get('/departments')
    expect(res.success).toBe(true)
    expect(res.data).toHaveLength(2)
  })

  it('创建部门成功', async () => {
    mock.onPost('/departments').reply(200, {
      success: true,
      data: { id: 10, name: '新部门' }
    })

    const res = await api.post('/departments', { name: '新部门', parent_id: 1 })
    expect(res.success).toBe(true)
  })

  it('更新部门成功', async () => {
    mock.onPut('/departments/1').reply(200, { success: true })

    const res = await api.put('/departments/1', { name: '技术部（修改）' })
    expect(res.success).toBe(true)
  })

  it('删除部门成功', async () => {
    mock.onDelete('/departments/1').reply(200, { success: true })

    const res = await api.delete('/departments/1')
    expect(res.success).toBe(true)
  })
})
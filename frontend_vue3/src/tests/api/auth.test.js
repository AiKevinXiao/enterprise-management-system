import { describe, it, expect, beforeEach, vi } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import api from '../../api/request.js'

// Mock router 避免 import 报错
vi.mock('../../router', () => ({
  default: {
    push: vi.fn(),
    replace: vi.fn(),
    currentRoute: { value: { path: '/login' } }
  }
}))

// Mock user store
vi.mock('../../stores/user', () => ({
  useUserStore: () => ({
    setToken: vi.fn(),
    setUser: vi.fn()
  })
}))

const mock = new MockAdapter(api)

describe('API - Auth 认证模块', () => {
  beforeEach(() => {
    mock.reset()
    localStorage.clear()
  })

  it('登录成功返回 token', async () => {
    mock.onPost('/auth/login').reply(200, {
      success: true,
      message: '登录成功',
      data: { token: 'test-token-123', id: 1, username: 'admin' }
    })

    const res = await api.post('/auth/login', { username: 'admin', password: 'admin123' })

    // response interceptor 返回 { success, data, message }
    expect(res.success).toBe(true)
    expect(res.data.token).toBe('test-token-123')
  })

  it('登录失败返回 success: false', async () => {
    mock.onPost('/auth/login').reply(200, {
      success: false,
      message: '用户名或密码错误'
    })

    const res = await api.post('/auth/login', { username: 'admin', password: 'wrong' })
    expect(res.success).toBe(false)
    expect(res.message).toBe('用户名或密码错误')
  })

  it('401 状态码清空 token 并跳转登录', async () => {
    mock.onPost('/auth/login').reply(401, { message: '未授权' })

    const res = await api.post('/auth/login', { username: 'admin', password: 'admin123' })
    expect(res.success).toBe(false)
    expect(res.message).toBe('登录已过期，请重新登录')
  })

  it('403 状态码返回无权限消息', async () => {
    mock.onGet('/auth/me').reply(403, { message: '权限不足' })

    const res = await api.get('/auth/me')
    expect(res.success).toBe(false)
    expect(res.message).toBe('权限不足')
  })
})
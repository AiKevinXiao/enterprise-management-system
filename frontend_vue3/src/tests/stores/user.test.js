import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '../../stores/user.js'

// Mock auth API
vi.mock('../../api/auth', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn()
}))

import { login, logout } from '../../api/auth.js'

describe('Store - User 用户状态管理', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('初始状态未登录', () => {
    const store = useUserStore()
    expect(store.isLoggedIn).toBe(false)
    expect(store.token).toBe('')
    expect(store.userInfo).toBe(null)
  })

  it('loginAction 成功时设置 token 和 userInfo', async () => {
    login.mockResolvedValue({
      success: true,
      data: {
        token: 'jwt-token-abc',
        user: { id: 1, username: 'admin', name: '管理员', permissions: ['user-view'] }
      }
    })

    const store = useUserStore()
    const res = await store.loginAction('admin', 'admin123')

    expect(res.success).toBe(true)
    expect(store.token).toBe('jwt-token-abc')
    expect(store.userInfo.username).toBe('admin')
    expect(store.isLoggedIn).toBe(true)
    expect(localStorage.getItem('ems_token')).toBe('jwt-token-abc')
  })

  it('loginAction 失败时不设置状态', async () => {
    login.mockResolvedValue({ success: false, message: '密码错误' })

    const store = useUserStore()
    const res = await store.loginAction('admin', 'wrong')

    expect(res.success).toBe(false)
    expect(store.token).toBe('')
  })

  it('logoutAction 清空状态', async () => {
    logout.mockResolvedValue({ success: true })

    const store = useUserStore()
    store.token = 'some-token'
    store.userInfo = { id: 1 }

    await store.logoutAction()

    expect(store.token).toBe('')
    expect(store.userInfo).toBe(null)
    expect(localStorage.getItem('ems_token')).toBeNull()
  })

  it('hasPermission 正确检查权限', () => {
    const store = useUserStore()
    store.userInfo = { permissions: ['user-view', 'user-create'] }

    expect(store.hasPermission('user-view')).toBe(true)
    expect(store.hasPermission('user-delete')).toBe(false)
  })

  it('hasAnyPermission 任意权限通过即可', () => {
    const store = useUserStore()
    store.userInfo = { permissions: ['user-view'] }

    expect(store.hasAnyPermission(['user-view', 'user-edit'])).toBe(true)
    expect(store.hasAnyPermission(['user-delete', 'user-edit'])).toBe(false)
  })
})
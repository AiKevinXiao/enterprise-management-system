import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login, logout, getCurrentUser } from '../api/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('ems_token') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('ems_user') || 'null'))

  const isLoggedIn = computed(() => !!token.value)
  const username = computed(() => userInfo.value?.username || '')
  const name = computed(() => userInfo.value?.name || '')
  const permissions = computed(() => userInfo.value?.permissions || [])
  const dataScope = computed(() => userInfo.value?.data_scope || 'self')
  const deptId = computed(() => userInfo.value?.dept_id || null)

  async function loginAction(username, password) {
    const res = await login(username, password)
    if (res.success) {
      token.value = res.data.token
      userInfo.value = res.data.user
      localStorage.setItem('ems_token', res.data.token)
      localStorage.setItem('ems_user', JSON.stringify(res.data.user))
    }
    return res
  }

  async function logoutAction() {
    try {
      await logout()
    } catch (e) {
      // ignore
    }
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('ems_token')
    localStorage.removeItem('ems_user')
  }

  function hasPermission(code) {
    return permissions.value.includes(code)
  }

  function hasAnyPermission(codes) {
    return codes.some(code => permissions.value.includes(code))
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    username,
    name,
    permissions,
    dataScope,
    deptId,
    loginAction,
    logoutAction,
    hasPermission,
    hasAnyPermission
  }
})

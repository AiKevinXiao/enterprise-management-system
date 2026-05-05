import axios from 'axios'
import { useUserStore } from '../stores/user'
import router from '../router'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('ems_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// 响应拦截器
api.interceptors.response.use(
  response => {
    const res = response.data
    const hasCode = typeof res.code === 'number'
    if (hasCode) {
      if (res.code !== 200) {
        return { success: false, message: res.message || `请求失败(${res.code})`, data: null }
      }
      // 兼容 { code, data, total, page, pageSize } 格式
      // data 为数组（列表）或对象（单条）
      return { success: true, data: res.data, total: res.total, page: res.page, pageSize: res.pageSize, message: res.message }
    }
    if (res.success === false) {
      return { success: false, message: res.message || '请求失败', data: null }
    }
    return { success: true, data: res.data, total: res.total, page: res.page, pageSize: res.pageSize, message: res.message }
  },
  error => {
    if (error.response) {
      const { status, data } = error.response
      if (status === 401) {
        localStorage.removeItem('ems_token')
        localStorage.removeItem('ems_user')
        router.push('/login')
        return { success: false, message: '登录已过期，请重新登录', data: null }
      }
      if (status === 403) {
        return { success: false, message: data.message || '无权限访问', data: null }
      }
      return { success: false, message: data.message || `服务器错误(${status})`, data: null }
    }
    return { success: false, message: error.message || '网络错误', data: null }
  }
)

export default api

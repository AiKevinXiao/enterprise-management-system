import api from './request'

export function getDashboardStats() {
  return api.get('/dashboard/stats')
}

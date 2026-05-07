import api from './request'

export function getOperationLogs(params) {
  return api.get('/operation-logs', { params })
}

export function getOperationLogStats(params) {
  return api.get('/operation-logs/stats', { params })
}

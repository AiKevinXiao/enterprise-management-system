import request from './request'

// ─── 导出 ────────────────────────────────────────────────
export function exportUsers() {
  return request({ url: '/export/users', method: 'get', responseType: 'blob' })
}
export function exportDepartments() {
  return request({ url: '/export/departments', method: 'get', responseType: 'blob' })
}
export function exportRoles() {
  return request({ url: '/export/roles', method: 'get', responseType: 'blob' })
}
export function exportOperationLogs(params) {
  return request({ url: '/export/operation-logs', method: 'get', params, responseType: 'blob' })
}

// ─── 导入 ────────────────────────────────────────────────
export function importUsers(formData) {
  return request({ url: '/import/users', method: 'post', data: formData })
}
export function importDepartments(formData) {
  return request({ url: '/import/departments', method: 'post', data: formData })
}
export function importRoles(formData) {
  return request({ url: '/import/roles', method: 'post', data: formData })
}
import api from './request'

export function getRoleList(params) {
  return api.get('/roles', { params })
}

export function getRoleById(id) {
  return api.get(`/roles/${id}`)
}

export function createRole(data) {
  return api.post('/roles', data)
}

export function updateRole(id, data) {
  return api.put(`/roles/${id}`, data)
}

export function deleteRole(id) {
  return api.delete(`/roles/${id}`)
}

export function restoreRole(id) {
  return api.put(`/roles/${id}/restore`)
}

export function getAllPermissions() {
  return api.get('/roles/permissions/all')
}

export function getRolePermissions(id) {
  return api.get(`/roles/${id}`)
}

export function updateRolePermissions(id, permissionIds) {
  return api.put(`/roles/${id}/permissions`, { permission_ids: permissionIds })
}

export function batchAction(action, ids) {
  return api.put('/roles/batch', { action, ids })
}

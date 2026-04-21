import api from './request'

export function getRoleList() {
  return api.get('/roles')
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

export function getRolePermissions(id) {
  return api.get(`/roles/${id}/permissions`)
}

export function updateRolePermissions(id, permissionIds) {
  return api.put(`/roles/${id}/permissions`, { permission_ids: permissionIds })
}

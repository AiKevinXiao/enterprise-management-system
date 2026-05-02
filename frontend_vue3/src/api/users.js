import api from './request'

export function getUserList(params) {
  return api.get('/users', { params })
}

export function getUserById(id) {
  return api.get(`/users/${id}`)
}

export function createUser(data) {
  return api.post('/users', data)
}

export function updateUser(id, data) {
  return api.put(`/users/${id}`, data)
}

export function deleteUser(id) {
  return api.delete(`/users/${id}`)
}

export function restoreUser(id) {
  return api.put(`/users/${id}/restore`)
}

export function resetPassword(id, password) {
  return api.put(`/users/${id}/reset-password`, { password })
}

export function batchAction(action, ids) {
  return api.post('/users/batch', { action, ids })
}

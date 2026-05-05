import api from './request'

export function getDepartmentList(params) {
  return api.get('/departments', { params })
}

export function getDepartmentById(id) {
  return api.get(`/departments/${id}`)
}

export function createDepartment(data) {
  return api.post('/departments', data)
}

export function updateDepartment(id, data) {
  return api.put(`/departments/${id}`, data)
}

export function deleteDepartment(id) {
  return api.delete(`/departments/${id}`)
}

export function restoreDepartment(id) {
  return api.put(`/departments/${id}/restore`)
}

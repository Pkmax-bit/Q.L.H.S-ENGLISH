import api from './api'

const enrollmentRequestsService = {
  getAll: (params) => api.get('/enrollment-requests', { params }),
  getPendingCount: () => api.get('/enrollment-requests/pending-count'),
  create: (data) => api.post('/enrollment-requests', data),
  approve: (id, data) => api.post(`/enrollment-requests/${id}/approve`, data),
  reject: (id, data) => api.post(`/enrollment-requests/${id}/reject`, data),
  cancel: (id) => api.delete(`/enrollment-requests/${id}`),
}

export default enrollmentRequestsService

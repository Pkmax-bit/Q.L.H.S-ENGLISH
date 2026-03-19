import api from './api'

const schedulesService = {
  getAll: (params) => api.get('/schedules', { params }),
  getById: (id) => api.get(`/schedules/${id}`),
  create: (data) => api.post('/schedules', data),
  bulkCreate: (data) => api.post('/schedules/bulk', data),
  update: (id, data) => api.put(`/schedules/${id}`, data),
  delete: (id) => api.delete(`/schedules/${id}`),
  getConflictPreview: (params) => api.get('/schedules/conflicts', { params }),
}

export default schedulesService

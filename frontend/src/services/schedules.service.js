import api from './api'

const schedulesService = {
  getAll: (params) => api.get('/schedules', { params }),
  getById: (id) => api.get(`/schedules/${id}`),
  create: (data) => api.post('/schedules', data),
  update: (id, data) => api.put(`/schedules/${id}`, data),
  delete: (id) => api.delete(`/schedules/${id}`),
  getSlots: (scheduleId) => api.get(`/schedules/${scheduleId}/slots`),
  createSlot: (scheduleId, data) => api.post(`/schedules/${scheduleId}/slots`, data),
  updateSlot: (scheduleId, slotId, data) => api.put(`/schedules/${scheduleId}/slots/${slotId}`, data),
  deleteSlot: (scheduleId, slotId) => api.delete(`/schedules/${scheduleId}/slots/${slotId}`),
}

export default schedulesService

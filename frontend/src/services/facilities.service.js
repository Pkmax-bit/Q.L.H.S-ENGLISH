import api from './api'

const facilitiesService = {
  getAll: (params) => api.get('/facilities', { params }),
  getById: (id) => api.get(`/facilities/${id}`),
  create: (data) => api.post('/facilities', data),
  update: (id, data) => api.put(`/facilities/${id}`, data),
  delete: (id) => api.delete(`/facilities/${id}`),
  getRooms: (facilityId) => api.get(`/facilities/${facilityId}/rooms`),
  createRoom: (facilityId, data) => api.post(`/facilities/${facilityId}/rooms`, data),
  updateRoom: (facilityId, roomId, data) => api.put(`/facilities/${facilityId}/rooms/${roomId}`, data),
  deleteRoom: (facilityId, roomId) => api.delete(`/facilities/${facilityId}/rooms/${roomId}`),
}

export default facilitiesService

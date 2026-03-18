import api from './api'

const financesService = {
  getAll: (params) => api.get('/finances', { params }),
  getById: (id) => api.get(`/finances/${id}`),
  create: (data) => api.post('/finances', data),
  update: (id, data) => api.put(`/finances/${id}`, data),
  delete: (id) => api.delete(`/finances/${id}`),
  getSummary: (params) => api.get('/finances/summary', { params }),
}

export default financesService

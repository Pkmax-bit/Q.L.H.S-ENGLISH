import api from './api'

const financesService = {
  getAll: (params) => api.get('/finances', { params }),
  getById: (id) => api.get(`/finances/${id}`),
  create: (data) => api.post('/finances', data),
  update: (id, data) => api.put(`/finances/${id}`, data),
  delete: (id) => api.delete(`/finances/${id}`),
  getSummary: (params) => api.get('/finances/summary', { params }),
  getCategories: () => api.get('/finances/categories'),
  createCategory: (data) => api.post('/finances/categories', data),
  updateCategory: (id, data) => api.put(`/finances/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/finances/categories/${id}`),
}

export default financesService

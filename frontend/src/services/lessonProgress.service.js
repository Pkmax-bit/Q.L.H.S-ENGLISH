import api from './api'

const lessonProgressService = {
  getMine: (params) => api.get('/lessons/progress', { params }),
  getOne: (lessonId) => api.get(`/lessons/${lessonId}/progress`),
  save: (lessonId, data) => api.put(`/lessons/${lessonId}/progress`, data),
}

export default lessonProgressService

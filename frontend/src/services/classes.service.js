import api from './api'

const classesService = {
  getAll: (params) => api.get('/classes', { params }),
  getById: (id) => api.get(`/classes/${id}`),
  create: (data) => api.post('/classes', data),
  update: (id, data) => api.put(`/classes/${id}`, data),
  delete: (id) => api.delete(`/classes/${id}`),
  getStudents: (id) => api.get(`/classes/${id}/students`),
  addStudent: (id, studentId) => api.post(`/classes/${id}/students`, { student_id: studentId }),
  removeStudent: (id, studentId) => api.delete(`/classes/${id}/students/${studentId}`),
}

export default classesService

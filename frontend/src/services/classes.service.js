import api from './api'

const classesService = {
  getAll: (params) => api.get('/classes', { params }),
  getById: (id) => api.get(`/classes/${id}`),
  getOverview: (id) => api.get(`/classes/${id}/overview`),
  create: (data) => api.post('/classes', data),
  update: (id, data) => api.put(`/classes/${id}`, data),
  delete: (id) => api.delete(`/classes/${id}`),
  getStudents: (id) => api.get(`/classes/${id}/students`),
  addStudent: (id, studentId) => api.post(`/classes/${id}/students`, { student_id: studentId }),
  addStudentsBatch: (id, studentIds) => api.post(`/classes/${id}/students/batch`, { student_ids: studentIds }),
  removeStudent: (id, studentId) => api.delete(`/classes/${id}/students/${studentId}`),
  removeStudentsBatch: (id, studentIds) => api.post(`/classes/${id}/students/batch-remove`, { student_ids: studentIds }),
}

export default classesService

import api from './api'

const submissionsService = {
  // Student
  start: (data) => api.post('/submissions/start', data),
  submit: (id, data) => api.post(`/submissions/${id}/submit`, data),
  getMy: (params) => api.get('/submissions/my', { params }),
  getMyForAssignment: (assignmentId) => api.get(`/submissions/my/${assignmentId}`),

  // Teacher/Admin
  getByAssignment: (assignmentId, params) => api.get(`/submissions/assignment/${assignmentId}`, { params }),
  grade: (id, data) => api.post(`/submissions/${id}/grade`, data),
  getGradeBook: (classId) => api.get(`/submissions/gradebook/${classId}`),

  // Common
  getById: (id) => api.get(`/submissions/${id}`),
}

export default submissionsService

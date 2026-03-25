import api from './api'

const templatesService = {
  getLessonTemplates: (params) => api.get('/templates/lessons', { params }),
  getAssignmentTemplates: (params) => api.get('/templates/assignments', { params }),
  applyLessonTemplates: (data) => api.post('/templates/lessons/apply', data),
  applyAssignmentTemplates: (data) => api.post('/templates/assignments/apply', data),
  markAsTemplate: (data) => api.post('/templates/mark', data),
  unmarkTemplate: (data) => api.post('/templates/unmark', data),

  // Permissions
  getPermissions: (type, id) => api.get(`/templates/permissions/${type}/${id}`),
  grantPermission: (data) => api.post('/templates/permissions', data),
  revokePermission: (id) => api.delete(`/templates/permissions/${id}`),
  bulkGrantAllTeachers: (data) => api.post('/templates/permissions/bulk-grant', data),
}

export default templatesService

import api from './api'

const assignmentsService = {
  getAll: (params) => api.get('/assignments', { params }),
  getById: (id) => api.get(`/assignments/${id}`),
  create: (data) => api.post('/assignments', data),
  update: (id, data) => api.put(`/assignments/${id}`, data),
  delete: (id) => api.delete(`/assignments/${id}`),

  // Bulk add questions to an assignment
  bulkAddQuestions: (assignmentId, questions) =>
    api.post(`/assignments/${assignmentId}/questions/bulk`, { questions }),

  // Sync (replace all) questions for an assignment
  syncQuestions: (assignmentId, questions) =>
    api.put(`/assignments/${assignmentId}/questions/sync`, { questions }),

  // Excel import: parse file → questions array
  parseExcelQuestions: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/assignments/import-questions/parse', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  // Download template Excel — params: { variant: 'general' | 'toeic_listening' | 'toeic_lr' | 'toeic_four_skills' }
  downloadQuestionTemplate: (params) =>
    api.get('/assignments/import-questions/template', { params, responseType: 'blob' }),

  /** Xuất đề ra Excel — có cột tên file media (basename URL). Body: { questions, assignment_type } */
  exportQuestionsExcel: (body) =>
    api.post('/assignments/export-questions-excel', body, { responseType: 'blob' }),
}

export default assignmentsService

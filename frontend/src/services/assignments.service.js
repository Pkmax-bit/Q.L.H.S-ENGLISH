import api from './api'

const assignmentsService = {
  getAll: (params) => api.get('/assignments', { params }),
  getById: (id) => api.get(`/assignments/${id}`),
  create: (data) => api.post('/assignments', data),
  update: (id, data) => api.put(`/assignments/${id}`, data),
  delete: (id) => api.delete(`/assignments/${id}`),

  // Excel import: parse file → questions array
  parseExcelQuestions: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/assignments/import-questions/parse', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  // Download template Excel file
  downloadQuestionTemplate: () =>
    api.get('/assignments/import-questions/template', { responseType: 'blob' }),
}

export default assignmentsService

import api from './api'

const questionBankService = {
  getAll: (params) => api.get('/question-bank', { params }),
  getById: (id) => api.get(`/question-bank/${id}`),
  create: (data) => api.post('/question-bank', data),
  update: (id, data) => api.put(`/question-bank/${id}`, data),
  remove: (id) => api.delete(`/question-bank/${id}`),
  upload: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/question-bank/upload', fd)
  },
}

export default questionBankService

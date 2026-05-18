import api from './api'

const tuitionService = {
  // Invoices
  getInvoices: (params) => api.get('/tuition/invoices', { params }),
  getInvoiceById: (id) => api.get(`/tuition/invoices/${id}`),
  createInvoice: (data) => api.post('/tuition/invoices', data),
  updateInvoice: (id, data) => api.put(`/tuition/invoices/${id}`, data),
  deleteInvoice: (id) => api.delete(`/tuition/invoices/${id}`),
  generateInvoices: (data) => api.post('/tuition/invoices/generate', data),

  // Payments
  recordPayment: (invoiceId, data) => api.post(`/tuition/invoices/${invoiceId}/payments`, data),
  deletePayment: (paymentId) => api.delete(`/tuition/payments/${paymentId}`),

  // Reports
  getReceivables: (params) => api.get('/tuition/reports/receivables', { params }),
  exportReceivables: (params) =>
    api.get('/tuition/reports/receivables/export', { params, responseType: 'blob' }),
  getRevenue: (params) => api.get('/tuition/reports/revenue', { params }),

  // Student
  getStudentLedger: (studentId) => api.get(`/tuition/students/${studentId}/ledger`),

  // By class
  getClassesSummary: (params) => api.get('/tuition/classes-summary', { params }),
  getClassStudents: (classId, params) => api.get(`/tuition/classes/${classId}/students`, { params }),
  getClassFeeProjection: (classId) => api.get(`/tuition/classes/${classId}/fee-projection`),

  // Upload payment proof image
  uploadTransferImage: (file) => {
    const fd = new FormData()
    fd.append('files', file)
    return api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },

  // Upload multiple invoice attachments
  uploadInvoiceImages: (files) => {
    const fd = new FormData()
    Array.from(files).forEach((f) => fd.append('files', f))
    return api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

export default tuitionService

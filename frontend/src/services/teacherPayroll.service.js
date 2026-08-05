import api from './api'

const teacherPayrollService = {
  listEntries: (params) => api.get('/teacher-payroll/entries', { params }),
  getOverview: (params) => api.get('/teacher-payroll/overview', { params }),
  getTeacherSummary: (teacherId, params) =>
    api.get(`/teacher-payroll/teachers/${teacherId}/summary`, { params }),
  generateEntries: (data) => api.post('/teacher-payroll/entries/generate', data),
  payEntry: (entryId, data) => api.post(`/teacher-payroll/entries/${entryId}/pay`, data),
}

export default teacherPayrollService

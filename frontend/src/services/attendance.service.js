import api from './api'

const attendanceService = {
  listSessions: (params) => api.get('/attendance/sessions', { params }),
  getSession: (sessionId) => api.get(`/attendance/sessions/${sessionId}`),
  createSession: (data) => api.post('/attendance/sessions', data),
  updateSession: (sessionId, data) => api.put(`/attendance/sessions/${sessionId}`, data),
  deleteSession: (sessionId) => api.delete(`/attendance/sessions/${sessionId}`),
  saveAttendance: (sessionId, data) => api.put(`/attendance/sessions/${sessionId}/attendance`, data),
  getScheduleCalendar: (classId, params) =>
    api.get(`/attendance/classes/${classId}/schedule-calendar`, { params }),
  ensureFromSchedule: (data) => api.post('/attendance/sessions/from-schedule', data),
  generateSessions: (data) => api.post('/attendance/sessions/generate', data),
  getStudentSummary: (studentId, params) =>
    api.get(`/attendance/students/${studentId}/summary`, { params }),
}

export default attendanceService

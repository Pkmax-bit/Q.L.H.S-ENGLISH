const attendanceService = require('../services/attendance.service');
const response = require('../utils/response');

const listSessions = async (req, res, next) => {
  try {
    const rows = await attendanceService.listSessions(req.query, req.user);
    return response.success(res, rows, 'Sessions retrieved');
  } catch (e) {
    if (e.statusCode === 403) return response.forbidden(res, e.message);
    next(e);
  }
};

const getSession = async (req, res, next) => {
  try {
    const row = await attendanceService.getSessionAttendance(req.params.sessionId, req.user);
    if (!row) return response.notFound(res, 'Session not found');
    return response.success(res, row, 'Session attendance retrieved');
  } catch (e) {
    if (e.statusCode === 403) return response.forbidden(res, e.message);
    next(e);
  }
};

const createSession = async (req, res, next) => {
  try {
    const row = await attendanceService.createSession(req.body, req.user);
    return response.created(res, row, 'Session created');
  } catch (e) {
    if (e.statusCode === 403) return response.forbidden(res, e.message);
    next(e);
  }
};

const updateSession = async (req, res, next) => {
  try {
    const row = await attendanceService.updateSession(req.params.sessionId, req.body, req.user);
    if (!row) return response.notFound(res, 'Session not found');
    return response.success(res, row, 'Session updated');
  } catch (e) {
    if (e.statusCode === 403) return response.forbidden(res, e.message);
    next(e);
  }
};

const removeSession = async (req, res, next) => {
  try {
    const row = await attendanceService.removeSession(req.params.sessionId, req.user);
    if (!row) return response.notFound(res, 'Session not found');
    return response.success(res, row, 'Session deleted');
  } catch (e) {
    if (e.statusCode === 403) return response.forbidden(res, e.message);
    next(e);
  }
};

const saveAttendance = async (req, res, next) => {
  try {
    const row = await attendanceService.saveAttendance(req.params.sessionId, req.body, req.user);
    if (!row) return response.notFound(res, 'Session not found');
    return response.success(res, row, 'Attendance saved');
  } catch (e) {
    if (e.statusCode === 403) return response.forbidden(res, e.message);
    next(e);
  }
};

const getScheduleCalendar = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return response.error(res, 'from và to là bắt buộc', 400);
    }
    const r = await attendanceService.getClassScheduleCalendar(
      req.params.classId,
      from,
      to,
      req.user
    );
    return response.success(res, r, 'Schedule calendar retrieved');
  } catch (e) {
    if (e.statusCode === 403) return response.forbidden(res, e.message);
    next(e);
  }
};

const ensureFromSchedule = async (req, res, next) => {
  try {
    const { class_id, schedule_id, session_date } = req.body;
    if (!class_id || !schedule_id || !session_date) {
      return response.error(res, 'class_id, schedule_id, session_date là bắt buộc', 400);
    }
    const r = await attendanceService.ensureSessionFromSchedule(
      class_id,
      schedule_id,
      session_date,
      req.user
    );
    return response.success(res, r, 'Session linked to schedule');
  } catch (e) {
    if (e.statusCode === 403) return response.forbidden(res, e.message);
    next(e);
  }
};

const generateSessions = async (req, res, next) => {
  try {
    const { class_id, from, to } = req.body;
    if (!class_id || !from || !to) {
      return response.error(res, 'class_id, from, to là bắt buộc', 400);
    }
    const r = await attendanceService.generateSessionsFromSchedule(class_id, from, to, req.user);
    return response.success(res, r, 'Sessions generated');
  } catch (e) {
    if (e.statusCode === 403) return response.forbidden(res, e.message);
    next(e);
  }
};

const getStudentSummary = async (req, res, next) => {
  try {
    const r = await attendanceService.getStudentAttendanceSummary(req.params.studentId, req.query);
    return response.success(res, r, 'Student attendance summary');
  } catch (e) {
    next(e);
  }
};

module.exports = {
  listSessions,
  getSession,
  createSession,
  updateSession,
  removeSession,
  saveAttendance,
  getScheduleCalendar,
  ensureFromSchedule,
  generateSessions,
  getStudentSummary,
};

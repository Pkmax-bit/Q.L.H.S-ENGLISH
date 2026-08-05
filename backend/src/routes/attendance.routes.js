const { Router } = require('express');
const ctrl = require('../controllers/attendance.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/classes/:classId/schedule-calendar', auth, ctrl.getScheduleCalendar);
router.get('/sessions', auth, ctrl.listSessions);
router.get('/sessions/:sessionId', auth, ctrl.getSession);
router.post('/sessions', auth, authorize('admin', 'teacher'), ctrl.createSession);
router.put('/sessions/:sessionId', auth, authorize('admin', 'teacher'), ctrl.updateSession);
router.delete('/sessions/:sessionId', auth, authorize('admin', 'teacher'), ctrl.removeSession);
router.put('/sessions/:sessionId/attendance', auth, authorize('admin', 'teacher'), ctrl.saveAttendance);
router.post('/sessions/from-schedule', auth, authorize('admin', 'teacher'), ctrl.ensureFromSchedule);
router.post('/sessions/generate', auth, authorize('admin', 'teacher'), ctrl.generateSessions);
router.get('/students/:studentId/summary', auth, ctrl.getStudentSummary);

module.exports = router;

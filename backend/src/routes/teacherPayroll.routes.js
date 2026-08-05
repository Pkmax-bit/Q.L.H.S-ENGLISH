const { Router } = require('express');
const ctrl = require('../controllers/teacherPayroll.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/entries', auth, authorize('admin'), ctrl.listEntries);
router.get('/overview', auth, authorize('admin'), ctrl.getFinanceOverview);
router.get('/teachers/:teacherId/summary', auth, authorize('admin'), ctrl.getTeacherSummary);
router.post('/entries/generate', auth, authorize('admin'), ctrl.generateEntries);
router.post('/entries/:entryId/pay', auth, authorize('admin'), ctrl.payEntry);

module.exports = router;

const { Router } = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const auth = require('../middleware/auth');

const router = Router();

router.get('/stats', auth, dashboardController.getStats);
router.get('/recent-activity', auth, dashboardController.getRecentActivity);
router.get('/teacher', auth, dashboardController.getTeacherDashboard);
router.get('/student', auth, dashboardController.getStudentDashboard);

module.exports = router;

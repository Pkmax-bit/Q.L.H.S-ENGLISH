const { Router } = require('express');
const controller = require('../controllers/submissions.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router();

// Student: start an assignment
router.post('/start', auth, authorize('student'), controller.start);

// Student: submit answers
router.post('/:id/submit', auth, authorize('student'), controller.submit);

// Student: get my submissions list
router.get('/my', auth, authorize('student'), controller.getMySubmissions);

// Student: check my submission for a specific assignment
router.get('/my/:assignmentId', auth, authorize('student'), controller.getMySubmission);

// Teacher/Admin: get all submissions for an assignment
router.get('/assignment/:assignmentId', auth, authorize('admin', 'teacher'), controller.getByAssignment);

// Teacher/Admin: grade a submission
router.post('/:id/grade', auth, authorize('admin', 'teacher'), controller.grade);

// Teacher/Admin: grade book for a class
router.get('/gradebook/:classId', auth, authorize('admin', 'teacher'), controller.getGradeBook);

// Get submission detail (all roles, service checks ownership)
router.get('/:id', auth, controller.getById);

module.exports = router;

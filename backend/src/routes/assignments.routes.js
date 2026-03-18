const { Router } = require('express');
const assignmentsController = require('../controllers/assignments.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/', auth, assignmentsController.getAll);
router.get('/:id', auth, assignmentsController.getById);
router.post('/', auth, authorize('admin', 'teacher'), assignmentsController.create);
router.put('/:id', auth, authorize('admin', 'teacher'), assignmentsController.update);
router.delete('/:id', auth, authorize('admin'), assignmentsController.remove);

// Questions (options are now stored as JSONB in assignment_questions.options)
router.post('/:id/questions', auth, authorize('admin', 'teacher'), assignmentsController.addQuestion);
router.put('/:id/questions/:questionId', auth, authorize('admin', 'teacher'), assignmentsController.updateQuestion);
router.delete('/:id/questions/:questionId', auth, authorize('admin', 'teacher'), assignmentsController.removeQuestion);

module.exports = router;

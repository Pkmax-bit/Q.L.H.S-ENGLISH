const { Router } = require('express');
const assignmentsController = require('../controllers/assignments.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const upload = require('../middleware/upload');

const router = Router();

router.get('/', auth, assignmentsController.getAll);
router.get('/:id', auth, assignmentsController.getById);
router.post('/', auth, authorize('admin', 'teacher'), assignmentsController.create);
router.put('/:id', auth, authorize('admin', 'teacher'), assignmentsController.update);
router.delete('/:id', auth, authorize('admin'), assignmentsController.remove);

// Questions
router.post('/:id/questions', auth, authorize('admin', 'teacher'), assignmentsController.addQuestion);
router.put('/:id/questions/:questionId', auth, authorize('admin', 'teacher'), assignmentsController.updateQuestion);
router.delete('/:id/questions/:questionId', auth, authorize('admin', 'teacher'), assignmentsController.removeQuestion);

// Options
router.post('/:id/questions/:questionId/options', auth, authorize('admin', 'teacher'), assignmentsController.addOption);
router.put('/:id/questions/:questionId/options/:optionId', auth, authorize('admin', 'teacher'), assignmentsController.updateOption);
router.delete('/:id/questions/:questionId/options/:optionId', auth, authorize('admin', 'teacher'), assignmentsController.removeOption);

// Attachments
router.post('/:id/attachments', auth, authorize('admin', 'teacher'), upload.single('file'), assignmentsController.uploadAttachment);
router.delete('/:id/attachments/:attachmentId', auth, authorize('admin', 'teacher'), assignmentsController.removeAttachment);

module.exports = router;

const { Router } = require('express');
const templatesController = require('../controllers/templates.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router();

// Get templates
router.get('/lessons', auth, templatesController.getLessonTemplates);
router.get('/assignments', auth, templatesController.getAssignmentTemplates);

// Apply templates to a class
router.post('/lessons/apply', auth, authorize('admin'), templatesController.applyLessonTemplates);
router.post('/assignments/apply', auth, authorize('admin'), templatesController.applyAssignmentTemplates);

// Mark/unmark as template
router.post('/mark', auth, authorize('admin'), templatesController.markAsTemplate);
router.post('/unmark', auth, authorize('admin'), templatesController.unmarkTemplate);

module.exports = router;

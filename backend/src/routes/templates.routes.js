const { Router } = require('express');
const templatesController = require('../controllers/templates.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router();

// Get templates (admin sees all, teacher sees permitted only)
router.get('/lessons', auth, authorize('admin', 'teacher'), templatesController.getLessonTemplates);
router.get('/assignments', auth, authorize('admin', 'teacher'), templatesController.getAssignmentTemplates);

// Apply templates to a class (admin + teacher)
router.post('/lessons/apply', auth, authorize('admin', 'teacher'), templatesController.applyLessonTemplates);
router.post('/assignments/apply', auth, authorize('admin', 'teacher'), templatesController.applyAssignmentTemplates);

// Mark/unmark as template (admin only)
router.post('/mark', auth, authorize('admin'), templatesController.markAsTemplate);
router.post('/unmark', auth, authorize('admin'), templatesController.unmarkTemplate);

// Permission management (admin only)
router.get('/permissions/:template_type/:template_id', auth, authorize('admin'), templatesController.getPermissions);
router.post('/permissions', auth, authorize('admin'), templatesController.grantPermission);
router.post('/permissions/bulk-grant', auth, authorize('admin'), templatesController.bulkGrantAllTeachers);
router.delete('/permissions/:id', auth, authorize('admin'), templatesController.revokePermission);

module.exports = router;

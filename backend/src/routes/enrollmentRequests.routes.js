const { Router } = require('express');
const controller = require('../controllers/enrollmentRequests.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router();

// List requests (admin sees all, teacher sees own)
router.get('/', auth, authorize('admin', 'teacher'), controller.getAll);

// Get pending count (for admin badge)
router.get('/pending-count', auth, authorize('admin'), controller.getPendingCount);

// Teacher creates a request
router.post('/', auth, authorize('teacher'), controller.create);

// Admin approves
router.post('/:id/approve', auth, authorize('admin'), controller.approve);

// Admin rejects
router.post('/:id/reject', auth, authorize('admin'), controller.reject);

// Teacher cancels own pending request, or admin cancels any
router.delete('/:id', auth, authorize('admin', 'teacher'), controller.cancel);

module.exports = router;

const { Router } = require('express');
const lessonsController = require('../controllers/lessons.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const upload = require('../middleware/upload');

const router = Router();

router.get('/', auth, lessonsController.getAll);
router.get('/:id', auth, lessonsController.getById);
router.post('/', auth, authorize('admin', 'teacher'), lessonsController.create);
router.put('/:id', auth, authorize('admin', 'teacher'), lessonsController.update);
router.delete('/:id', auth, authorize('admin'), lessonsController.remove);

// Attachments
router.post('/:id/attachments', auth, authorize('admin', 'teacher'), upload.single('file'), lessonsController.uploadAttachment);
router.delete('/:id/attachments/:attachmentId', auth, authorize('admin', 'teacher'), lessonsController.removeAttachment);

module.exports = router;

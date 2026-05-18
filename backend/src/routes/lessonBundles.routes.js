const { Router } = require('express');
const ctrl = require('../controllers/lessonBundles.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/', auth, authorize('admin', 'teacher'), ctrl.getAll);
router.get('/:id', auth, authorize('admin', 'teacher'), ctrl.getById);
router.post('/', auth, authorize('admin', 'teacher'), ctrl.create);
router.put('/:id', auth, authorize('admin', 'teacher'), ctrl.update);
router.delete('/:id', auth, authorize('admin'), ctrl.remove);

router.post('/:id/items', auth, authorize('admin', 'teacher'), ctrl.addItems);
router.delete('/:id/items/:lesson_id', auth, authorize('admin', 'teacher'), ctrl.removeItem);
router.post('/:id/reorder', auth, authorize('admin', 'teacher'), ctrl.reorderItems);

router.post('/:id/apply', auth, authorize('admin', 'teacher'), ctrl.applyToClass);

module.exports = router;

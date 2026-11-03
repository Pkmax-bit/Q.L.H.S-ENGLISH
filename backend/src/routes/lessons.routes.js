const { Router } = require('express');
const lessonsController = require('../controllers/lessons.controller');
const lessonProgressController = require('../controllers/lessonProgress.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/', auth, lessonsController.getAll);
router.get('/progress', auth, lessonProgressController.listMine);
router.get('/:id/progress', auth, lessonProgressController.getOne);
router.put('/:id/progress', auth, lessonProgressController.upsert);
router.get('/:id', auth, lessonsController.getById);
router.post('/', auth, authorize('admin', 'teacher'), lessonsController.create);
router.put('/:id', auth, authorize('admin', 'teacher'), lessonsController.update);
router.delete('/:id', auth, authorize('admin'), lessonsController.remove);

module.exports = router;

const { Router } = require('express');
const lessonsController = require('../controllers/lessons.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/', auth, lessonsController.getAll);
router.get('/:id', auth, lessonsController.getById);
router.post('/', auth, authorize('admin', 'teacher'), lessonsController.create);
router.put('/:id', auth, authorize('admin', 'teacher'), lessonsController.update);
router.delete('/:id', auth, authorize('admin'), lessonsController.remove);

module.exports = router;

const { Router } = require('express');
const schedulesController = require('../controllers/schedules.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/', auth, schedulesController.getAll);
router.get('/:id', auth, schedulesController.getById);
router.post('/', auth, authorize('admin'), schedulesController.create);
router.post('/bulk', auth, authorize('admin'), schedulesController.bulkCreate);
router.put('/:id', auth, authorize('admin'), schedulesController.update);
router.delete('/:id', auth, authorize('admin'), schedulesController.remove);

module.exports = router;

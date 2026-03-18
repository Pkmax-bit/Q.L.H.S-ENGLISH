const { Router } = require('express');
const schedulesController = require('../controllers/schedules.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/', auth, schedulesController.getAll);
router.get('/:id', auth, schedulesController.getById);
router.post('/', auth, authorize('admin'), schedulesController.create);
router.put('/:id', auth, authorize('admin'), schedulesController.update);
router.delete('/:id', auth, authorize('admin'), schedulesController.remove);

// Slots
router.post('/:id/slots', auth, authorize('admin'), schedulesController.addSlot);
router.put('/:id/slots/:slotId', auth, authorize('admin'), schedulesController.updateSlot);
router.delete('/:id/slots/:slotId', auth, authorize('admin'), schedulesController.removeSlot);

module.exports = router;

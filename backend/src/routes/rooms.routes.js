const { Router } = require('express');
const roomsController = require('../controllers/rooms.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/', auth, roomsController.getAll);
router.get('/:id', auth, roomsController.getById);
router.post('/', auth, authorize('admin'), roomsController.create);
router.put('/:id', auth, authorize('admin'), roomsController.update);
router.delete('/:id', auth, authorize('admin'), roomsController.remove);

module.exports = router;

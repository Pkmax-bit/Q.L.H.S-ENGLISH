const { Router } = require('express');
const facilitiesController = require('../controllers/facilities.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/', auth, facilitiesController.getAll);
router.get('/:id', auth, facilitiesController.getById);
router.post('/', auth, authorize('admin'), facilitiesController.create);
router.put('/:id', auth, authorize('admin'), facilitiesController.update);
router.delete('/:id', auth, authorize('admin'), facilitiesController.remove);

module.exports = router;

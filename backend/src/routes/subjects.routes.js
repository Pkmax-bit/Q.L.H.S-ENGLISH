const { Router } = require('express');
const subjectsController = require('../controllers/subjects.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/', auth, subjectsController.getAll);
router.get('/:id', auth, subjectsController.getById);
router.post('/', auth, authorize('admin'), subjectsController.create);
router.put('/:id', auth, authorize('admin'), subjectsController.update);
router.delete('/:id', auth, authorize('admin'), subjectsController.remove);

module.exports = router;

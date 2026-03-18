const { Router } = require('express');
const teachersController = require('../controllers/teachers.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/', auth, teachersController.getAll);
router.get('/export/excel', auth, teachersController.exportExcel);
router.get('/:id', auth, teachersController.getById);
router.get('/:id/classes', auth, teachersController.getClasses);
router.get('/:id/schedule', auth, teachersController.getSchedule);
router.post('/', auth, authorize('admin'), teachersController.create);
router.put('/:id', auth, authorize('admin'), teachersController.update);
router.delete('/:id', auth, authorize('admin'), teachersController.remove);

module.exports = router;

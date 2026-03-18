const { Router } = require('express');
const studentsController = require('../controllers/students.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/', auth, studentsController.getAll);
router.get('/export/excel', auth, studentsController.exportExcel);
router.get('/:id', auth, studentsController.getById);
router.get('/:id/classes', auth, studentsController.getClasses);
router.post('/', auth, authorize('admin', 'teacher'), studentsController.create);
router.put('/:id', auth, authorize('admin', 'teacher'), studentsController.update);
router.delete('/:id', auth, authorize('admin'), studentsController.remove);

module.exports = router;

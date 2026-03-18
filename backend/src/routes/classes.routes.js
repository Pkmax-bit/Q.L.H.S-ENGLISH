const { Router } = require('express');
const classesController = require('../controllers/classes.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/', auth, classesController.getAll);
router.get('/:id', auth, classesController.getById);
router.post('/', auth, authorize('admin'), classesController.create);
router.put('/:id', auth, authorize('admin'), classesController.update);
router.delete('/:id', auth, authorize('admin'), classesController.remove);

// Manage students in class
router.get('/:id/students', auth, classesController.getStudents);
router.post('/:id/students', auth, authorize('admin', 'teacher'), classesController.addStudent);
router.delete('/:id/students/:studentId', auth, authorize('admin', 'teacher'), classesController.removeStudent);

// Manage teachers in class
router.get('/:id/teachers', auth, classesController.getTeachers);
router.post('/:id/teachers', auth, authorize('admin'), classesController.addTeacher);
router.delete('/:id/teachers/:teacherId', auth, authorize('admin'), classesController.removeTeacher);

module.exports = router;

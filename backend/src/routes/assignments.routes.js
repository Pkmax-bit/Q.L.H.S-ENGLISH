const { Router } = require('express');
const assignmentsController = require('../controllers/assignments.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const multer = require('multer');

// Memory storage for Excel parsing (no need to save to disk)
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file Excel (.xlsx, .xls)'), false);
    }
  },
});

const router = Router();

// Excel import/export for questions — MUST be before /:id routes
router.post('/import-questions/parse', auth, authorize('admin', 'teacher'), excelUpload.single('file'), assignmentsController.parseExcelQuestions);
router.get('/import-questions/template', auth, authorize('admin', 'teacher'), assignmentsController.downloadQuestionTemplate);

router.get('/', auth, assignmentsController.getAll);
router.get('/:id', auth, assignmentsController.getById);
router.post('/', auth, authorize('admin', 'teacher'), assignmentsController.create);
router.put('/:id', auth, authorize('admin', 'teacher'), assignmentsController.update);
router.delete('/:id', auth, authorize('admin'), assignmentsController.remove);

// Questions (options are now stored as JSONB in assignment_questions.options)
router.post('/:id/questions', auth, authorize('admin', 'teacher'), assignmentsController.addQuestion);
router.put('/:id/questions/:questionId', auth, authorize('admin', 'teacher'), assignmentsController.updateQuestion);
router.delete('/:id/questions/:questionId', auth, authorize('admin', 'teacher'), assignmentsController.removeQuestion);

module.exports = router;

const { Router } = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const uploadQuestionBank = require('../middleware/uploadQuestionBank');
const questionBankController = require('../controllers/questionBank.controller');

const router = Router();

router.post(
  '/upload',
  auth,
  authorize('admin', 'teacher'),
  uploadQuestionBank.single('file'),
  questionBankController.upload
);

router.get('/', auth, authorize('admin', 'teacher'), questionBankController.getAll);
router.get('/:id', auth, authorize('admin', 'teacher'), questionBankController.getById);
router.post('/', auth, authorize('admin', 'teacher'), questionBankController.create);
router.put('/:id', auth, authorize('admin', 'teacher'), questionBankController.update);
router.delete('/:id', auth, authorize('admin', 'teacher'), questionBankController.remove);

module.exports = router;

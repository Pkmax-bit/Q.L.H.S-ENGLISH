const { Router } = require('express');
const financesController = require('../controllers/finances.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router();

router.get('/', auth, financesController.getAll);
router.get('/summary', auth, financesController.getSummary);
router.get('/export/excel', auth, financesController.exportExcel);
router.get('/:id', auth, financesController.getById);
router.post('/', auth, authorize('admin'), financesController.create);
router.put('/:id', auth, authorize('admin'), financesController.update);
router.delete('/:id', auth, authorize('admin'), financesController.remove);

module.exports = router;

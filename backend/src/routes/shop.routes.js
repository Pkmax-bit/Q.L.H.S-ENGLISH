const { Router } = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const shopController = require('../controllers/shop.controller');

const router = Router();

router.use(auth);

router.get('/items', shopController.listItems);

router.get('/wallet', authorize('student'), shopController.getWallet);
router.get('/ledger', authorize('student'), shopController.listLedger);
router.post('/items/:id/purchase', authorize('student'), shopController.purchase);
router.get('/play/:slug', authorize('student'), shopController.getPlayAccess);
router.get('/saves/:slug', authorize('student'), shopController.getSave);
router.put('/saves/:slug', authorize('student'), shopController.putSave);
router.delete('/saves/:slug', authorize('student'), shopController.deleteSave);

router.get('/content/:slug', shopController.getContent);
router.put('/content/:slug', authorize('admin', 'teacher'), shopController.putContent);
router.post('/content/:slug/reset', authorize('admin', 'teacher'), shopController.resetContent);

module.exports = router;

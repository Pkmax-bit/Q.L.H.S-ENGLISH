const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = Router();

router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/logout-all', auth, authController.logoutAll);
router.get('/me', auth, authController.getMe);
router.put('/change-password', auth, authController.changePassword);
router.post('/register', auth, authorize('admin'), authController.register);

module.exports = router;

const { Router } = require('express');
const auth = require('../middleware/auth');
const messengerController = require('../controllers/messenger.controller');

const router = Router();

router.get('/groups', auth, messengerController.listGroups);
router.post('/groups', auth, messengerController.createGroup);
router.post('/direct', auth, messengerController.createDirect);
router.post('/classes/:classId/ensure', auth, messengerController.ensureClassChat);
router.get('/contacts', auth, messengerController.listContacts);

router.get('/groups/:id/chat', auth, messengerController.getMessages);
router.post('/groups/:id/chat', auth, messengerController.uploadMiddleware, messengerController.sendMessage);
router.patch('/groups/:id/read', auth, messengerController.markRead);

module.exports = router;

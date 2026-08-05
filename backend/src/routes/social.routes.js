const { Router } = require('express');
const auth = require('../middleware/auth');
const socialController = require('../controllers/social.controller');

const router = Router();

router.use(auth);

router.get('/feed', socialController.listFeed);
router.get('/stats', socialController.getFeedStats);
router.get('/members/search', socialController.searchMembers);
router.post('/posts', socialController.uploadMiddleware, socialController.createPost);
router.delete('/posts/:id', socialController.deletePost);
router.post('/posts/:id/like', socialController.toggleLike);
router.get('/posts/:id/comments', socialController.listComments);
router.post('/posts/:id/comments', socialController.addComment);
router.get('/profiles/:userId', socialController.getProfile);
router.post('/profile/upload', socialController.uploadMiddleware, socialController.uploadProfileImage);

module.exports = router;

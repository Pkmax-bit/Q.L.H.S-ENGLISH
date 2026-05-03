const { Router } = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const upload = require('../middleware/upload');
const uploadsController = require('../controllers/uploads.controller');

const router = Router();

router.post(
  '/',
  auth,
  authorize('admin', 'teacher'),
  upload.array('files', 120),
  uploadsController.uploadMany
);

module.exports = router;

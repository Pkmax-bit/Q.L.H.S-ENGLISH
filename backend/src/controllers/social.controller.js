const multer = require('multer');
const socialService = require('../services/social.service');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const fail = (res, err) => {
  const status = err.status || 500;
  res.status(status).json({ success: false, message: err.message || 'Lỗi máy chủ', data: null });
};

exports.listFeed = async (req, res) => {
  try {
    const data = await socialService.listFeed({
      viewerId: req.user.id,
      limit: req.query.limit,
      offset: req.query.offset,
      authorId: req.query.author_id || null,
    });
    ok(res, data);
  } catch (err) {
    fail(res, err);
  }
};

exports.createPost = async (req, res) => {
  try {
    let image_url = req.body.image_url || null;
    if (req.file) {
      image_url = socialService.storeUploadedFile(req.file).url;
    }
    const data = await socialService.createPost(req.user.id, {
      body: req.body.body,
      image_url,
    });
    ok(res, data, 201);
  } catch (err) {
    fail(res, err);
  }
};

exports.deletePost = async (req, res) => {
  try {
    const data = await socialService.deletePost(req.user.id, req.params.id, req.user.role);
    ok(res, data);
  } catch (err) {
    fail(res, err);
  }
};

exports.toggleLike = async (req, res) => {
  try {
    const data = await socialService.toggleLike(req.user.id, req.params.id);
    ok(res, data);
  } catch (err) {
    fail(res, err);
  }
};

exports.listComments = async (req, res) => {
  try {
    const data = await socialService.listComments(req.params.id);
    ok(res, data);
  } catch (err) {
    fail(res, err);
  }
};

exports.addComment = async (req, res) => {
  try {
    const data = await socialService.addComment(req.user.id, req.params.id, req.body.body);
    ok(res, data, 201);
  } catch (err) {
    fail(res, err);
  }
};

exports.getProfile = async (req, res) => {
  try {
    const data = await socialService.getPublicProfile(req.params.userId, req.user.id, req.user.role);
    ok(res, data);
  } catch (err) {
    fail(res, err);
  }
};

exports.searchMembers = async (req, res) => {
  try {
    const data = await socialService.searchMembers(req.query.q, req.query.limit);
    ok(res, data);
  } catch (err) {
    fail(res, err);
  }
};

exports.getFeedStats = async (req, res) => {
  try {
    const data = await socialService.getFeedStats();
    ok(res, data);
  } catch (err) {
    fail(res, err);
  }
};

exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Thiếu file', data: null });
    }
    const file = socialService.storeUploadedFile(req.file);
    ok(res, { url: file.url });
  } catch (err) {
    fail(res, err);
  }
};

exports.uploadMiddleware = upload.single('file');

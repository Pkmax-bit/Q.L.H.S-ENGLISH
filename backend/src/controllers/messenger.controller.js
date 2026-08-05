const multer = require('multer');
const messengerService = require('../services/messenger.service');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const fail = (res, err) => {
  const status = err.status || 500;
  res.status(status).json({ success: false, message: err.message || 'Lỗi máy chủ', data: null });
};

exports.listGroups = async (req, res) => {
  try {
    const data = await messengerService.listGroups(req.user.id);
    ok(res, data);
  } catch (err) {
    fail(res, err);
  }
};

exports.createGroup = async (req, res) => {
  try {
    const { name, member_ids: memberIds } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Thiếu tên nhóm', data: null });
    }
    const group = await messengerService.createGroup({
      name: name.trim(),
      memberIds: memberIds || [],
      createdBy: req.user.id,
    });
    ok(res, group, 201);
  } catch (err) {
    fail(res, err);
  }
};

exports.createDirect = async (req, res) => {
  try {
    const peerId = req.body.peer_user_id;
    if (!peerId) {
      return res.status(400).json({ success: false, message: 'Thiếu peer_user_id', data: null });
    }
    const group = await messengerService.createDirectChat(req.user.id, peerId, req.user.role);
    ok(res, group, 201);
  } catch (err) {
    fail(res, err);
  }
};

exports.ensureClassChat = async (req, res) => {
  try {
    const group = await messengerService.ensureClassChat(req.params.classId, req.user.id, req.user.role);
    ok(res, group);
  } catch (err) {
    fail(res, err);
  }
};

exports.getMessages = async (req, res) => {
  try {
    const data = await messengerService.getMessages(req.params.id, req.user.id);
    ok(res, data);
  } catch (err) {
    fail(res, err);
  }
};

exports.sendMessage = async (req, res) => {
  try {
    let attachment = null;
    if (req.file) {
      attachment = messengerService.storeUploadedFile(req.file);
    }
    const data = await messengerService.sendMessage(req.params.id, req.user.id, {
      content: req.body.content,
      reply_to: req.body.reply_to,
      attachment,
    });
    ok(res, data, 201);
  } catch (err) {
    fail(res, err);
  }
};

exports.markRead = async (req, res) => {
  try {
    const data = await messengerService.markRead(req.params.id, req.user.id);
    ok(res, data);
  } catch (err) {
    fail(res, err);
  }
};

exports.listContacts = async (req, res) => {
  try {
    const data = await messengerService.listContacts(req.user.id, req.user.role);
    ok(res, data);
  } catch (err) {
    fail(res, err);
  }
};

exports.uploadMiddleware = upload.single('file');

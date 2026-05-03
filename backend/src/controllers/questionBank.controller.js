const response = require('../utils/response');
const questionBankService = require('../services/questionBank.service');

const canModify = (item, user) => {
  if (!item) return false;
  if (user.role === 'admin') return true;
  return item.created_by === user.id;
};

const getAll = async (req, res, next) => {
  try {
    const result = await questionBankService.getAll(req.query);
    return response.success(res, result.data, 'OK', 200, result.pagination);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const item = await questionBankService.getById(req.params.id);
    if (!item) {
      return response.notFound(res, 'Không tìm thấy câu hỏi');
    }
    return response.success(res, item, 'OK');
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const row = await questionBankService.create({
      ...req.body,
      created_by: req.user.id,
    });
    return response.created(res, row, 'Đã tạo');
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const existing = await questionBankService.getById(req.params.id);
    if (!existing) {
      return response.notFound(res, 'Không tìm thấy câu hỏi');
    }
    if (!canModify(existing, req.user)) {
      return response.forbidden(res, 'Không có quyền sửa mục này');
    }
    const row = await questionBankService.update(req.params.id, existing, req.body);
    if (!row) {
      return response.notFound(res, 'Không tìm thấy câu hỏi');
    }
    return response.success(res, row, 'Đã cập nhật');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const existing = await questionBankService.getById(req.params.id);
    if (!existing) {
      return response.notFound(res, 'Không tìm thấy câu hỏi');
    }
    if (!canModify(existing, req.user)) {
      return response.forbidden(res, 'Không có quyền xóa mục này');
    }
    await questionBankService.remove(existing);
    return response.success(res, { id: req.params.id }, 'Đã xóa');
  } catch (err) {
    next(err);
  }
};

const upload = async (req, res, next) => {
  try {
    const file = req.file;
    if (!file || !file.buffer) {
      return response.badRequest(res, 'Thiếu file');
    }
    const result = await questionBankService.uploadMedia({
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
      userId: req.user.id,
    });
    return response.success(res, result, 'Upload thành công');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  upload,
};

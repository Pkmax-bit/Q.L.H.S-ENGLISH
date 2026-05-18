const lessonBundlesService = require('../services/lessonBundles.service');
const response = require('../utils/response');

const getAll = async (req, res, next) => {
  try {
    const data = await lessonBundlesService.getAll(req.query);
    return response.success(res, data, 'Lesson bundles retrieved');
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const data = await lessonBundlesService.getById(req.params.id);
    if (!data) return response.notFound(res, 'Bundle not found');
    return response.success(res, data, 'Bundle retrieved');
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const data = await lessonBundlesService.create(req.body || {}, req.user.id);
    return response.created(res, data, 'Đã tạo bộ bài học');
  } catch (err) {
    if (err.statusCode) return response.error(res, err.message, err.statusCode);
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await lessonBundlesService.update(req.params.id, req.body || {});
    if (!data) return response.notFound(res, 'Bundle not found');
    return response.success(res, data, 'Đã cập nhật bộ bài học');
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const data = await lessonBundlesService.remove(req.params.id);
    if (!data) return response.notFound(res, 'Bundle not found');
    return response.success(res, data, 'Đã xóa bộ bài học');
  } catch (err) { next(err); }
};

const addItems = async (req, res, next) => {
  try {
    const { lesson_ids } = req.body || {};
    if (!Array.isArray(lesson_ids) || lesson_ids.length === 0) {
      return response.badRequest(res, 'lesson_ids là bắt buộc');
    }
    const data = await lessonBundlesService.addItems(req.params.id, lesson_ids);
    return response.success(res, data, `Đã thêm ${data.added} bài học vào bộ`);
  } catch (err) { next(err); }
};

const removeItem = async (req, res, next) => {
  try {
    const data = await lessonBundlesService.removeItem(req.params.id, req.params.lesson_id);
    if (!data) return response.notFound(res, 'Item not found');
    return response.success(res, data, 'Đã xóa bài khỏi bộ');
  } catch (err) { next(err); }
};

const reorderItems = async (req, res, next) => {
  try {
    const { lesson_ids } = req.body || {};
    const data = await lessonBundlesService.reorderItems(req.params.id, lesson_ids || []);
    return response.success(res, data, 'Đã sắp xếp lại bộ');
  } catch (err) { next(err); }
};

const applyToClass = async (req, res, next) => {
  try {
    const { class_id, lesson_ids } = req.body || {};
    if (!class_id) return response.badRequest(res, 'class_id là bắt buộc');
    const data = await lessonBundlesService.applyToClass(
      req.params.id, class_id, lesson_ids, req.user.id,
    );
    return response.created(res, data, `Đã áp dụng ${data.created} bài học từ bộ vào lớp`);
  } catch (err) {
    if (err.statusCode) return response.error(res, err.message, err.statusCode);
    next(err);
  }
};

module.exports = {
  getAll, getById, create, update, remove,
  addItems, removeItem, reorderItems, applyToClass,
};

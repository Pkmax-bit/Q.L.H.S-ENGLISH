const lessonsService = require('../services/lessons.service');
const response = require('../utils/response');
const { emitNotification } = require('../socket');

const getAll = async (req, res, next) => {
  try {
    const result = await lessonsService.getAll(req.query);
    return response.success(res, result.data, 'Lessons retrieved', 200, result.pagination);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const lesson = await lessonsService.getById(req.params.id);
    if (!lesson) {
      return response.notFound(res, 'Lesson not found');
    }
    return response.success(res, lesson, 'Lesson retrieved');
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const data = { ...req.body, created_by: req.user.id };
    const lesson = await lessonsService.create(data);
    emitNotification('lesson:created', lesson);
    return response.created(res, lesson, 'Lesson created successfully');
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const lesson = await lessonsService.update(req.params.id, req.body);
    if (!lesson) {
      return response.notFound(res, 'Lesson not found');
    }
    emitNotification('lesson:updated', lesson);
    return response.success(res, lesson, 'Lesson updated successfully');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await lessonsService.remove(req.params.id);
    if (!result) {
      return response.notFound(res, 'Lesson not found');
    }
    emitNotification('lesson:deleted', { id: req.params.id });
    return response.success(res, null, 'Lesson deleted successfully');
  } catch (error) {
    next(error);
  }
};

const uploadAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return response.badRequest(res, 'No file uploaded');
    }

    const fileData = {
      file_name: req.file.originalname,
      file_url: `/uploads/${req.file.filename}`,
      file_type: req.file.mimetype,
      file_size: req.file.size,
    };

    const attachment = await lessonsService.addAttachment(req.params.id, fileData);
    return response.created(res, attachment, 'Attachment uploaded successfully');
  } catch (error) {
    next(error);
  }
};

const removeAttachment = async (req, res, next) => {
  try {
    const result = await lessonsService.removeAttachment(req.params.attachmentId);
    if (!result) {
      return response.notFound(res, 'Attachment not found');
    }
    return response.success(res, null, 'Attachment removed successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove, uploadAttachment, removeAttachment };

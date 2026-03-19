const templatesService = require('../services/templates.service');
const response = require('../utils/response');

const getLessonTemplates = async (req, res, next) => {
  try {
    const data = await templatesService.getLessonTemplates(req.query);
    return response.success(res, data, 'Lesson templates retrieved');
  } catch (error) { next(error); }
};

const getAssignmentTemplates = async (req, res, next) => {
  try {
    const data = await templatesService.getAssignmentTemplates(req.query);
    return response.success(res, data, 'Assignment templates retrieved');
  } catch (error) { next(error); }
};

const applyLessonTemplates = async (req, res, next) => {
  try {
    const { template_ids, class_id } = req.body;
    if (!template_ids || !class_id) {
      return response.error(res, 'template_ids và class_id là bắt buộc', 400);
    }
    const result = await templatesService.applyLessonTemplates(template_ids, class_id, req.user.id);
    return response.created(res, result, `Đã áp dụng ${result.created} bài học mẫu`);
  } catch (error) {
    if (error.statusCode) return response.error(res, error.message, error.statusCode);
    next(error);
  }
};

const applyAssignmentTemplates = async (req, res, next) => {
  try {
    const { template_ids, class_id } = req.body;
    if (!template_ids || !class_id) {
      return response.error(res, 'template_ids và class_id là bắt buộc', 400);
    }
    const result = await templatesService.applyAssignmentTemplates(template_ids, class_id, req.user.id);
    return response.created(res, result, `Đã áp dụng ${result.created} bài tập mẫu`);
  } catch (error) {
    if (error.statusCode) return response.error(res, error.message, error.statusCode);
    next(error);
  }
};

const markAsTemplate = async (req, res, next) => {
  try {
    const { type, ids } = req.body;
    if (!type || !ids || !['lesson', 'assignment'].includes(type)) {
      return response.error(res, 'type (lesson|assignment) và ids là bắt buộc', 400);
    }
    const data = await templatesService.markAsTemplate(type, ids);
    return response.success(res, data, `Đã đánh dấu ${data.length} mục làm mẫu`);
  } catch (error) { next(error); }
};

const unmarkTemplate = async (req, res, next) => {
  try {
    const { type, ids } = req.body;
    if (!type || !ids) {
      return response.error(res, 'type và ids là bắt buộc', 400);
    }
    const data = await templatesService.unmarkTemplate(type, ids);
    return response.success(res, data, `Đã bỏ đánh dấu mẫu`);
  } catch (error) { next(error); }
};

module.exports = {
  getLessonTemplates,
  getAssignmentTemplates,
  applyLessonTemplates,
  applyAssignmentTemplates,
  markAsTemplate,
  unmarkTemplate,
};

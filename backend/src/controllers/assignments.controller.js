const assignmentsService = require('../services/assignments.service');
const response = require('../utils/response');
const { emitNotification } = require('../socket');

const getAll = async (req, res, next) => {
  try {
    const result = await assignmentsService.getAll(req.query);
    return response.success(res, result.data, 'Assignments retrieved', 200, result.pagination);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const assignment = await assignmentsService.getById(req.params.id);
    if (!assignment) {
      return response.notFound(res, 'Assignment not found');
    }
    return response.success(res, assignment, 'Assignment retrieved');
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const data = { ...req.body, created_by: req.user.id };
    const assignment = await assignmentsService.create(data);
    emitNotification('assignment:created', assignment);
    return response.created(res, assignment, 'Assignment created successfully');
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const assignment = await assignmentsService.update(req.params.id, req.body);
    if (!assignment) {
      return response.notFound(res, 'Assignment not found');
    }
    emitNotification('assignment:updated', assignment);
    return response.success(res, assignment, 'Assignment updated successfully');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await assignmentsService.remove(req.params.id);
    if (!result) {
      return response.notFound(res, 'Assignment not found');
    }
    emitNotification('assignment:deleted', { id: req.params.id });
    return response.success(res, null, 'Assignment deleted successfully');
  } catch (error) {
    next(error);
  }
};

const addQuestion = async (req, res, next) => {
  try {
    const question = await assignmentsService.addQuestion(req.params.id, req.body);
    return response.created(res, question, 'Question added successfully');
  } catch (error) {
    next(error);
  }
};

const updateQuestion = async (req, res, next) => {
  try {
    const question = await assignmentsService.updateQuestion(req.params.questionId, req.body);
    if (!question) {
      return response.notFound(res, 'Question not found');
    }
    return response.success(res, question, 'Question updated successfully');
  } catch (error) {
    next(error);
  }
};

const removeQuestion = async (req, res, next) => {
  try {
    const result = await assignmentsService.removeQuestion(req.params.questionId);
    if (!result) {
      return response.notFound(res, 'Question not found');
    }
    return response.success(res, null, 'Question removed successfully');
  } catch (error) {
    next(error);
  }
};

const addOption = async (req, res, next) => {
  try {
    const option = await assignmentsService.addOption(req.params.questionId, req.body);
    return response.created(res, option, 'Option added successfully');
  } catch (error) {
    next(error);
  }
};

const updateOption = async (req, res, next) => {
  try {
    const option = await assignmentsService.updateOption(req.params.optionId, req.body);
    if (!option) {
      return response.notFound(res, 'Option not found');
    }
    return response.success(res, option, 'Option updated successfully');
  } catch (error) {
    next(error);
  }
};

const removeOption = async (req, res, next) => {
  try {
    const result = await assignmentsService.removeOption(req.params.optionId);
    if (!result) {
      return response.notFound(res, 'Option not found');
    }
    return response.success(res, null, 'Option removed successfully');
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

    const attachment = await assignmentsService.addAttachment(req.params.id, fileData);
    return response.created(res, attachment, 'Attachment uploaded successfully');
  } catch (error) {
    next(error);
  }
};

const removeAttachment = async (req, res, next) => {
  try {
    const result = await assignmentsService.removeAttachment(req.params.attachmentId);
    if (!result) {
      return response.notFound(res, 'Attachment not found');
    }
    return response.success(res, null, 'Attachment removed successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll, getById, create, update, remove,
  addQuestion, updateQuestion, removeQuestion,
  addOption, updateOption, removeOption,
  uploadAttachment, removeAttachment,
};

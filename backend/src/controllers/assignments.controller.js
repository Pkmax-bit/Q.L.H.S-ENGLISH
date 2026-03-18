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

module.exports = {
  getAll, getById, create, update, remove,
  addQuestion, updateQuestion, removeQuestion,
};

const subjectsService = require('../services/subjects.service');
const response = require('../utils/response');
const { emitNotification } = require('../socket');

const getAll = async (req, res, next) => {
  try {
    const result = await subjectsService.getAll(req.query);
    return response.success(res, result.data, 'Subjects retrieved', 200, result.pagination);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const subject = await subjectsService.getById(req.params.id);
    if (!subject) {
      return response.notFound(res, 'Subject not found');
    }
    return response.success(res, subject, 'Subject retrieved');
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const subject = await subjectsService.create(req.body);
    emitNotification('subject:created', subject);
    return response.created(res, subject, 'Subject created successfully');
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const subject = await subjectsService.update(req.params.id, req.body);
    if (!subject) {
      return response.notFound(res, 'Subject not found');
    }
    emitNotification('subject:updated', subject);
    return response.success(res, subject, 'Subject updated successfully');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await subjectsService.remove(req.params.id);
    if (!result) {
      return response.notFound(res, 'Subject not found');
    }
    emitNotification('subject:deleted', { id: req.params.id });
    return response.success(res, null, 'Subject deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove };

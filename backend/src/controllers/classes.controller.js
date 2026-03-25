const classesService = require('../services/classes.service');
const response = require('../utils/response');
const { emitNotification } = require('../socket');

const getAll = async (req, res, next) => {
  try {
    // Pass user info so service can filter by role
    const result = await classesService.getAll(req.query, req.user);
    return response.success(res, result.data, 'Classes retrieved', 200, result.pagination);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const cls = await classesService.getById(req.params.id);
    if (!cls) {
      return response.notFound(res, 'Class not found');
    }
    return response.success(res, cls, 'Class retrieved');
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const cls = await classesService.create(req.body);
    emitNotification('class:created', cls);
    return response.created(res, cls, 'Class created successfully');
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const cls = await classesService.update(req.params.id, req.body);
    if (!cls) {
      return response.notFound(res, 'Class not found');
    }
    emitNotification('class:updated', cls);
    return response.success(res, cls, 'Class updated successfully');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await classesService.remove(req.params.id);
    if (!result) {
      return response.notFound(res, 'Class not found');
    }
    emitNotification('class:deleted', { id: req.params.id });
    return response.success(res, null, 'Class deleted successfully');
  } catch (error) {
    next(error);
  }
};

const getStudents = async (req, res, next) => {
  try {
    const students = await classesService.getStudents(req.params.id);
    return response.success(res, students, 'Class students retrieved');
  } catch (error) {
    next(error);
  }
};

const addStudent = async (req, res, next) => {
  try {
    const { student_id } = req.body;
    if (!student_id) {
      return response.badRequest(res, 'student_id is required');
    }
    const result = await classesService.addStudent(req.params.id, student_id);
    emitNotification('class:student_added', { class_id: req.params.id, student_id });
    return response.created(res, result, 'Student added to class');
  } catch (error) {
    if (error.statusCode) {
      return response.error(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const removeStudent = async (req, res, next) => {
  try {
    const result = await classesService.removeStudent(req.params.id, req.params.studentId);
    if (!result) {
      return response.notFound(res, 'Student not found in class');
    }
    emitNotification('class:student_removed', { class_id: req.params.id, student_id: req.params.studentId });
    return response.success(res, null, 'Student removed from class');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll, getById, create, update, remove,
  getStudents, addStudent, removeStudent,
};

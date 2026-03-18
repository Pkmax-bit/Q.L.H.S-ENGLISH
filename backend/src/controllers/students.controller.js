const studentsService = require('../services/students.service');
const response = require('../utils/response');
const { exportToExcel } = require('../utils/excel');
const { emitNotification } = require('../socket');

const getAll = async (req, res, next) => {
  try {
    const result = await studentsService.getAll(req.query);
    return response.success(res, result.data, 'Students retrieved', 200, result.pagination);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const student = await studentsService.getById(req.params.id);
    if (!student) {
      return response.notFound(res, 'Student not found');
    }
    return response.success(res, student, 'Student retrieved');
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const student = await studentsService.create(req.body);
    emitNotification('student:created', student);
    return response.created(res, student, 'Student created successfully');
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const student = await studentsService.update(req.params.id, req.body);
    if (!student) {
      return response.notFound(res, 'Student not found');
    }
    emitNotification('student:updated', student);
    return response.success(res, student, 'Student updated successfully');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await studentsService.remove(req.params.id);
    if (!result) {
      return response.notFound(res, 'Student not found');
    }
    emitNotification('student:deleted', { id: req.params.id });
    return response.success(res, null, 'Student deleted successfully');
  } catch (error) {
    next(error);
  }
};

const getClasses = async (req, res, next) => {
  try {
    const classes = await studentsService.getClasses(req.params.id);
    return response.success(res, classes, 'Student classes retrieved');
  } catch (error) {
    next(error);
  }
};

const exportExcel = async (req, res, next) => {
  try {
    const data = await studentsService.getAllForExport(req.query);
    const columns = [
      { key: 'full_name', header: 'Full Name', width: 25 },
      { key: 'email', header: 'Email', width: 30 },
      { key: 'phone', header: 'Phone', width: 15 },
      { key: 'is_active', header: 'Active', width: 10 },
      { key: 'created_at', header: 'Created At', width: 20 },
    ];
    const buffer = exportToExcel(data, 'Students', columns);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=students.xlsx');
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove, getClasses, exportExcel };

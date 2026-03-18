const teachersService = require('../services/teachers.service');
const response = require('../utils/response');
const { exportToExcel } = require('../utils/excel');
const { emitNotification } = require('../socket');

const getAll = async (req, res, next) => {
  try {
    const result = await teachersService.getAll(req.query);
    return response.success(res, result.data, 'Teachers retrieved', 200, result.pagination);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const teacher = await teachersService.getById(req.params.id);
    if (!teacher) {
      return response.notFound(res, 'Teacher not found');
    }
    return response.success(res, teacher, 'Teacher retrieved');
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const teacher = await teachersService.create(req.body);
    emitNotification('teacher:created', teacher);
    return response.created(res, teacher, 'Teacher created successfully');
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const teacher = await teachersService.update(req.params.id, req.body);
    if (!teacher) {
      return response.notFound(res, 'Teacher not found');
    }
    emitNotification('teacher:updated', teacher);
    return response.success(res, teacher, 'Teacher updated successfully');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await teachersService.remove(req.params.id);
    if (!result) {
      return response.notFound(res, 'Teacher not found');
    }
    emitNotification('teacher:deleted', { id: req.params.id });
    return response.success(res, null, 'Teacher deleted successfully');
  } catch (error) {
    next(error);
  }
};

const getClasses = async (req, res, next) => {
  try {
    const classes = await teachersService.getClasses(req.params.id);
    return response.success(res, classes, 'Teacher classes retrieved');
  } catch (error) {
    next(error);
  }
};

const getSchedule = async (req, res, next) => {
  try {
    const schedule = await teachersService.getSchedule(req.params.id);
    return response.success(res, schedule, 'Teacher schedule retrieved');
  } catch (error) {
    next(error);
  }
};

const exportExcel = async (req, res, next) => {
  try {
    const data = await teachersService.getAllForExport(req.query);
    const columns = [
      { key: 'full_name', header: 'Full Name', width: 25 },
      { key: 'email', header: 'Email', width: 30 },
      { key: 'phone', header: 'Phone', width: 15 },
      { key: 'specialization', header: 'Specialization', width: 20 },
      { key: 'status', header: 'Status', width: 12 },
      { key: 'salary', header: 'Salary', width: 15 },
      { key: 'hire_date', header: 'Hire Date', width: 15 },
    ];
    const buffer = exportToExcel(data, 'Teachers', columns);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=teachers.xlsx');
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove, getClasses, getSchedule, exportExcel };

const schedulesService = require('../services/schedules.service');
const response = require('../utils/response');
const { emitNotification } = require('../socket');

const getAll = async (req, res, next) => {
  try {
    // Pass user info so service can filter by role
    const result = await schedulesService.getAll(req.query, req.user);
    return response.success(res, result.data, 'Schedules retrieved', 200, result.pagination);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const schedule = await schedulesService.getById(req.params.id);
    if (!schedule) {
      return response.notFound(res, 'Schedule not found');
    }
    return response.success(res, schedule, 'Schedule retrieved');
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const schedule = await schedulesService.create(req.body);
    emitNotification('schedule:created', schedule);
    return response.created(res, schedule, 'Schedule created successfully');
  } catch (error) {
    if (error.statusCode) {
      return response.error(res, error.message, error.statusCode, error.data);
    }
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const schedule = await schedulesService.update(req.params.id, req.body);
    if (!schedule) {
      return response.notFound(res, 'Schedule not found');
    }
    emitNotification('schedule:updated', schedule);
    return response.success(res, schedule, 'Schedule updated successfully');
  } catch (error) {
    if (error.statusCode) {
      return response.error(res, error.message, error.statusCode, error.data);
    }
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await schedulesService.remove(req.params.id);
    if (!result) {
      return response.notFound(res, 'Schedule not found');
    }
    emitNotification('schedule:deleted', { id: req.params.id });
    return response.success(res, null, 'Schedule deleted successfully');
  } catch (error) {
    next(error);
  }
};

const bulkCreate = async (req, res, next) => {
  try {
    const result = await schedulesService.bulkCreate(req.body);
    emitNotification('schedule:bulk-created', result);
    return response.created(res, result, `Đã tạo ${result.created} lịch học`);
  } catch (error) {
    if (error.statusCode) {
      return response.error(res, error.message, error.statusCode, error.data);
    }
    next(error);
  }
};

const conflictPreview = async (req, res, next) => {
  try {
    const { day_of_week, start_time, end_time } = req.query;
    if (day_of_week === undefined || !start_time || !end_time) {
      return response.error(res, 'day_of_week, start_time, end_time là bắt buộc', 400);
    }
    const data = await schedulesService.getConflictPreview(
      Number(day_of_week), start_time, end_time
    );
    return response.success(res, data, 'Conflict preview');
  } catch (error) { next(error); }
};

module.exports = { getAll, getById, create, update, remove, bulkCreate, conflictPreview };

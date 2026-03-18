const schedulesService = require('../services/schedules.service');
const response = require('../utils/response');
const { emitNotification } = require('../socket');

const getAll = async (req, res, next) => {
  try {
    const result = await schedulesService.getAll(req.query);
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

const addSlot = async (req, res, next) => {
  try {
    const slot = await schedulesService.addSlot(req.params.id, req.body);
    emitNotification('schedule:slot_added', slot);
    return response.created(res, slot, 'Schedule slot added successfully');
  } catch (error) {
    if (error.statusCode) {
      return response.error(res, error.message, error.statusCode, error.data);
    }
    next(error);
  }
};

const updateSlot = async (req, res, next) => {
  try {
    const slot = await schedulesService.updateSlot(req.params.slotId, req.body);
    if (!slot) {
      return response.notFound(res, 'Schedule slot not found');
    }
    emitNotification('schedule:slot_updated', slot);
    return response.success(res, slot, 'Schedule slot updated successfully');
  } catch (error) {
    if (error.statusCode) {
      return response.error(res, error.message, error.statusCode, error.data);
    }
    next(error);
  }
};

const removeSlot = async (req, res, next) => {
  try {
    const result = await schedulesService.removeSlot(req.params.slotId);
    if (!result) {
      return response.notFound(res, 'Schedule slot not found');
    }
    emitNotification('schedule:slot_deleted', { id: req.params.slotId });
    return response.success(res, null, 'Schedule slot removed successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove, addSlot, updateSlot, removeSlot };

const roomsService = require('../services/rooms.service');
const response = require('../utils/response');
const { emitNotification } = require('../socket');

const getAll = async (req, res, next) => {
  try {
    const result = await roomsService.getAll(req.query);
    return response.success(res, result.data, 'Rooms retrieved', 200, result.pagination);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const room = await roomsService.getById(req.params.id);
    if (!room) {
      return response.notFound(res, 'Room not found');
    }
    return response.success(res, room, 'Room retrieved');
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const room = await roomsService.create(req.body);
    emitNotification('room:created', room);
    return response.created(res, room, 'Room created successfully');
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const room = await roomsService.update(req.params.id, req.body);
    if (!room) {
      return response.notFound(res, 'Room not found');
    }
    emitNotification('room:updated', room);
    return response.success(res, room, 'Room updated successfully');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await roomsService.remove(req.params.id);
    if (!result) {
      return response.notFound(res, 'Room not found');
    }
    emitNotification('room:deleted', { id: req.params.id });
    return response.success(res, null, 'Room deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove };

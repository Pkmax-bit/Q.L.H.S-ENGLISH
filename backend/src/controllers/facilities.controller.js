const facilitiesService = require('../services/facilities.service');
const response = require('../utils/response');
const { emitNotification } = require('../socket');

const getAll = async (req, res, next) => {
  try {
    const result = await facilitiesService.getAll(req.query);
    return response.success(res, result.data, 'Facilities retrieved', 200, result.pagination);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const facility = await facilitiesService.getById(req.params.id);
    if (!facility) {
      return response.notFound(res, 'Facility not found');
    }
    return response.success(res, facility, 'Facility retrieved');
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const facility = await facilitiesService.create(req.body);
    emitNotification('facility:created', facility);
    return response.created(res, facility, 'Facility created successfully');
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const facility = await facilitiesService.update(req.params.id, req.body);
    if (!facility) {
      return response.notFound(res, 'Facility not found');
    }
    emitNotification('facility:updated', facility);
    return response.success(res, facility, 'Facility updated successfully');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await facilitiesService.remove(req.params.id);
    if (!result) {
      return response.notFound(res, 'Facility not found');
    }
    emitNotification('facility:deleted', { id: req.params.id });
    return response.success(res, null, 'Facility deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove };

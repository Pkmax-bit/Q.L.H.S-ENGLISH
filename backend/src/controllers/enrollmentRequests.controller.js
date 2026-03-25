const enrollmentRequestsService = require('../services/enrollmentRequests.service');
const response = require('../utils/response');
const { emitNotification } = require('../socket');

const getAll = async (req, res, next) => {
  try {
    const result = await enrollmentRequestsService.getAll(req.query, req.user);
    return response.success(res, result.data, 'Enrollment requests retrieved', 200, result.pagination);
  } catch (error) {
    next(error);
  }
};

const getPendingCount = async (req, res, next) => {
  try {
    const count = await enrollmentRequestsService.getPendingCount();
    return response.success(res, { count }, 'Pending count retrieved');
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const result = await enrollmentRequestsService.create(req.body, req.user);
    emitNotification('enrollment-request:created', result);
    return response.created(res, result, 'Yêu cầu thêm học sinh đã được gửi, chờ admin duyệt');
  } catch (error) {
    if (error.statusCode) {
      return response.error(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const approve = async (req, res, next) => {
  try {
    const { review_note } = req.body || {};
    const result = await enrollmentRequestsService.approve(req.params.id, req.user, review_note);
    emitNotification('enrollment-request:approved', result);
    return response.success(res, result, 'Yêu cầu đã được duyệt, học sinh đã được thêm vào lớp');
  } catch (error) {
    if (error.statusCode) {
      return response.error(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const reject = async (req, res, next) => {
  try {
    const { review_note } = req.body || {};
    const result = await enrollmentRequestsService.reject(req.params.id, req.user, review_note);
    emitNotification('enrollment-request:rejected', result);
    return response.success(res, result, 'Yêu cầu đã bị từ chối');
  } catch (error) {
    if (error.statusCode) {
      return response.error(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const cancel = async (req, res, next) => {
  try {
    const result = await enrollmentRequestsService.cancel(req.params.id, req.user);
    emitNotification('enrollment-request:cancelled', result);
    return response.success(res, result, 'Yêu cầu đã được hủy');
  } catch (error) {
    if (error.statusCode) {
      return response.error(res, error.message, error.statusCode);
    }
    next(error);
  }
};

module.exports = { getAll, getPendingCount, create, approve, reject, cancel };

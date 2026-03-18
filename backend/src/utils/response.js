const success = (res, data = null, message = 'Success', statusCode = 200, pagination = null) => {
  const response = {
    success: true,
    message,
    data,
  };
  if (pagination) {
    response.pagination = pagination;
  }
  return res.status(statusCode).json(response);
};

const created = (res, data = null, message = 'Created successfully') => {
  return success(res, data, message, 201);
};

const error = (res, message = 'Internal server error', statusCode = 500, data = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data,
  });
};

const notFound = (res, message = 'Resource not found') => {
  return error(res, message, 404);
};

const badRequest = (res, message = 'Bad request', data = null) => {
  return error(res, message, 400, data);
};

const unauthorized = (res, message = 'Unauthorized') => {
  return error(res, message, 401);
};

const forbidden = (res, message = 'Forbidden') => {
  return error(res, message, 403);
};

module.exports = {
  success,
  created,
  error,
  notFound,
  badRequest,
  unauthorized,
  forbidden,
};

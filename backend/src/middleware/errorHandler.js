const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB',
        data: null,
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
      data: null,
    });
  }

  if (err.message && (err.message.includes('File type') || err.message.includes('Định dạng không hỗ trợ'))) {
    return res.status(400).json({
      success: false,
      message: err.message,
      data: null,
    });
  }

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      data: null,
    });
  }

  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'A record with this value already exists',
      data: null,
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced record does not exist',
      data: null,
    });
  }

  if (err.code === '23514') {
    const detail = err.details || err.detail || err.message || '';
    return res.status(400).json({
      success: false,
      message: detail && String(detail).length > 0
        ? `Value violates check constraint: ${detail}`
        : 'Value violates check constraint',
      data: null,
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    data: null,
  });
};

module.exports = errorHandler;

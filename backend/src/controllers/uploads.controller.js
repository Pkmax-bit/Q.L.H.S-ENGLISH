const response = require('../utils/response');

/**
 * Upload nhiều file (ảnh / âm thanh / …) → URL /uploads/...
 */
const uploadMany = async (req, res, next) => {
  try {
    const files = req.files || [];
    const urls = files.map((f) => `/uploads/${f.filename}`);
    return response.success(res, { urls }, 'Upload thành công', 200);
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadMany };

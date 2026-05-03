const multer = require('multer');

const allowedTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
  'audio/aac',
  'audio/flac',
  'audio/x-m4a',
  'audio/mp4',
]);

const fileFilter = (req, file, cb) => {
  if (allowedTypes.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Định dạng không hỗ trợ: ${file.mimetype}`), false);
  }
};

const uploadQuestionBank = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter,
});

module.exports = uploadQuestionBank;

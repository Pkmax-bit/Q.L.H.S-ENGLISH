const { Router } = require('express');
const driveController = require('../controllers/drive.controller');

const router = Router();

/**
 * Public proxy stream cho file Google Drive đã share công khai.
 * Lý do không yêu cầu auth: thẻ <audio>/<img>/<video> của browser không tự gửi
 * Authorization header — sẽ vỡ tính năng nếu bắt buộc Bearer token.
 * Bù lại: rate-limit theo IP (xem drive.controller.js).
 */
router.get('/', driveController.proxy);

/** Endpoint kiểm tra metadata (frontend dùng nút "Dán & kiểm tra link Drive"). */
router.get('/check', driveController.head);

module.exports = router;

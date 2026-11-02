const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

/**
 * Xác thực người đăng ký lịch học ở trang công khai.
 *
 * KHÔNG tái dùng middleware/auth.js: middleware đó gắn `req.user.role` và cả
 * hệ thống phân quyền dựa vào đó. Người đăng ký không có role, không có
 * profile — họ chỉ là một dòng trong booking_registrants.
 *
 * Token được ký bằng jwtConfig.booking.secret (khác hẳn access secret), nên
 * không thể mang token này đi gọi API nội bộ.
 *
 * Lợi ích so với việc gửi SĐT kèm mỗi request: sau màn nhập SĐT, client không
 * còn gửi SĐT nữa, nên không thể sửa số trong devtools để đụng vào chỗ của
 * người khác.
 */
const bookingAuth = (req, res, next) => {
  try {
    const header = req.headers['x-booking-token'] || '';
    const token = String(header).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng nhập số điện thoại để tiếp tục',
        data: null,
      });
    }

    const decoded = jwt.verify(token, jwtConfig.booking.secret);

    if (decoded.kind !== 'booking' || !decoded.rid) {
      return res.status(401).json({
        success: false,
        message: 'Phiên đăng ký không hợp lệ, vui lòng nhập lại số điện thoại',
        data: null,
      });
    }

    req.registrant = { id: decoded.rid, phone: decoded.phone || null };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Phiên đăng ký đã hết hạn, vui lòng nhập lại số điện thoại',
        data: null,
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Phiên đăng ký không hợp lệ, vui lòng nhập lại số điện thoại',
        data: null,
      });
    }
    return next(error);
  }
};

/**
 * Như bookingAuth nhưng không bắt buộc — dùng cho GET bảng công khai:
 * có token thì đánh dấu ca mình đã giữ, không có thì vẫn xem được bảng.
 */
const optionalBookingAuth = (req, res, next) => {
  const token = String(req.headers['x-booking-token'] || '').trim();
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, jwtConfig.booking.secret);
    if (decoded.kind === 'booking' && decoded.rid) {
      req.registrant = { id: decoded.rid, phone: decoded.phone || null };
    }
  } catch {
    // Token hỏng/hết hạn thì coi như khách vãng lai, không chặn xem bảng
  }
  next();
};

module.exports = bookingAuth;
module.exports.bookingAuth = bookingAuth;
module.exports.optionalBookingAuth = optionalBookingAuth;

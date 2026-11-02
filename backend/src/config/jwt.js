module.exports = {
  access: {
    secret: process.env.JWT_ACCESS_SECRET,
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '24h',
  },
  refresh: {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: '30d',
    expiresInMs: 30 * 24 * 60 * 60 * 1000,
  },
  // Token của người đăng ký lịch học qua trang công khai (chỉ có SĐT, không có role).
  // Ký bằng secret RIÊNG để token này không bao giờ dùng được như access token
  // của tài khoản nội bộ, và ngược lại.
  booking: {
    secret: process.env.JWT_BOOKING_SECRET || `${process.env.JWT_ACCESS_SECRET || ''}::booking`,
    expiresIn: process.env.JWT_BOOKING_EXPIRES || '30d',
  },
};

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/booking.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { bookingAuth, optionalBookingAuth } = require('../middleware/bookingAuth');

const router = Router();

// Nhánh /public không có JWT nội bộ nên phải tự chặn spam theo IP.
// Nhập SĐT là thao tác tạo bản ghi -> siết chặt hơn các thao tác đọc/giữ chỗ.
// Cả lớp ngồi chung wifi trung tâm là cùng một IP, nên ngưỡng phải rộng tay
const identifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Bạn thử quá nhiều lần, vui lòng đợi ít phút.', data: null },
});

// Mỗi client tự làm mới 25s/lần, nhiều người chung IP sẽ cộng dồn nhanh
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Thao tác quá nhanh, vui lòng thử lại sau một phút.', data: null },
});

// ============================ CÔNG KHAI (không cần tài khoản) ============================

// Nhận diện bằng SĐT; SĐT lạ thì trả needs_name để frontend hỏi thêm họ tên
router.post('/public/identify', identifyLimiter, controller.identify);

// Xem bảng — có token thì đánh dấu ca mình đã giữ, không có vẫn xem được
router.get('/public/boards/:slug', publicLimiter, optionalBookingAuth, controller.getPublicBoard);

// Thông tin của chính mình
router.get('/public/me', publicLimiter, bookingAuth, controller.getMe);

// Giữ chỗ / tự hủy chỗ
router.post('/public/slots/:slotId/register', publicLimiter, bookingAuth, controller.registerSlot);
router.delete('/public/entries/:entryId', publicLimiter, bookingAuth, controller.cancelMyEntry);

// ============================ QUẢN TRỊ (admin + giáo viên) ============================

router.get('/boards', auth, authorize('admin', 'teacher'), controller.listBoards);
router.post('/boards', auth, authorize('admin', 'teacher'), controller.createBoard);
router.get('/boards/:id', auth, authorize('admin', 'teacher'), controller.getBoardDetail);
router.put('/boards/:id', auth, authorize('admin', 'teacher'), controller.updateBoard);
router.delete('/boards/:id', auth, authorize('admin'), controller.deleteBoard);
router.post('/boards/:id/clone', auth, authorize('admin', 'teacher'), controller.cloneBoard);

router.post('/boards/:id/slots', auth, authorize('admin', 'teacher'), controller.createSlot);
router.post('/boards/:id/slots/bulk', auth, authorize('admin', 'teacher'), controller.createSlotsBulk);
router.put('/slots/:slotId', auth, authorize('admin', 'teacher'), controller.updateSlot);
router.delete('/slots/:slotId', auth, authorize('admin', 'teacher'), controller.deleteSlot);

router.get('/boards/:id/registrations', auth, authorize('admin', 'teacher'), controller.listRegistrations);
router.get('/boards/:id/registrations.csv', auth, authorize('admin', 'teacher'), controller.exportRegistrations);

router.post('/slots/:slotId/entries', auth, authorize('admin', 'teacher'), controller.adminAddEntry);
router.delete('/entries/:entryId', auth, authorize('admin', 'teacher'), controller.adminCancelEntry);

module.exports = router;

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/booking.controller');
const scheduling = require('../controllers/bookingScheduling.controller');
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

// Nguyện vọng giờ học: ô trống trên lưới, KHÔNG giữ chỗ
router.post('/public/boards/:slug/requests', publicLimiter, bookingAuth, controller.createRequests);
router.delete('/public/requests/:requestId', publicLimiter, bookingAuth, controller.cancelMyRequest);

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

router.get('/boards/:id/requests', auth, authorize('admin', 'teacher'), controller.listRequests);
router.post('/requests/review', auth, authorize('admin', 'teacher'), controller.reviewRequests);
router.post('/boards/:id/requests/open-slot', auth, authorize('admin', 'teacher'), controller.createSlotFromRequests);

router.post('/slots/:slotId/entries', auth, authorize('admin', 'teacher'), controller.adminAddEntry);
router.delete('/entries/:entryId', auth, authorize('admin', 'teacher'), controller.adminCancelEntry);

// ============================ XẾP LỊCH (chỉ admin) ============================
// Riêng nhánh này chỉ cho 'admin': nó sửa được lịch VÀ giá tiền của người khác.
// Giáo viên thường không nên có quyền đổi tiền của học viên.
const admin = [auth, authorize('admin')];

router.get('/registrants', ...admin, scheduling.listRegistrants);
router.get('/registrants/:registrantId/price-tiers', ...admin, scheduling.listPriceTiers);
router.post('/registrants/:registrantId/price-tiers', ...admin, scheduling.createPriceTier);
router.put('/price-tiers/:tierId', ...admin, scheduling.updatePriceTier);
router.delete('/price-tiers/:tierId', ...admin, scheduling.deletePriceTier);

router.get('/boards/:id/pool', ...admin, scheduling.listPool);
router.post('/boards/:id/pool', ...admin, scheduling.addToPool);
router.delete('/pool/:itemId', ...admin, scheduling.removeFromPool);

router.post('/slots/:slotId/assign', ...admin, scheduling.assignToSlot);
router.put('/entries/:entryId/price', ...admin, scheduling.updateEntryPrice);
router.post('/entries/:entryId/detach', ...admin, scheduling.detachToPool);
router.post('/entries/:entryId/move', ...admin, scheduling.moveEntry);

module.exports = router;

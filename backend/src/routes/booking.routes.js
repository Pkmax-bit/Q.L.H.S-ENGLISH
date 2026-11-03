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
router.patch('/public/requests/:requestId', publicLimiter, bookingAuth, controller.updateMyRequest);
// Hai đường dành cho SỐ ĐƯỢC ĐÁNH DẤU QUẢN LÝ (047). Không có middleware riêng:
// cờ nằm ở DB và được service đọc lại theo phiên, middleware chỉ xác thực phiên.
router.get('/public/boards/:slug/students', publicLimiter, bookingAuth, controller.listBoardStudents);
router.get('/public/boards/:slug/activity', publicLimiter, bookingAuth, controller.listMyBoardActivity);
// Chat: học viên chỉ đụng luồng của mình, quản lý xem được mọi luồng (service kiểm cờ)
router.get('/public/boards/:slug/messages', publicLimiter, bookingAuth, controller.listMessages);
router.post(
  '/public/boards/:slug/messages',
  publicLimiter,
  bookingAuth,
  controller.chatImageUpload,
  controller.sendMessage
);
router.get('/public/boards/:slug/threads', publicLimiter, bookingAuth, controller.listThreads);
router.post('/public/messages/:messageId/reactions', publicLimiter, bookingAuth, controller.toggleReaction);
router.post('/public/boards/:slug/polls', publicLimiter, bookingAuth, controller.createPoll);
router.post('/public/messages/:messageId/vote', publicLimiter, bookingAuth, controller.votePoll);
router.post('/public/messages/:messageId/close-poll', publicLimiter, bookingAuth, controller.closePoll);
router.delete('/public/messages/:messageId/poll', publicLimiter, bookingAuth, controller.deletePoll);
router.delete('/public/messages/:messageId', publicLimiter, bookingAuth, controller.deleteMessage);
router.post('/public/boards/:slug/sync-sheet', publicLimiter, bookingAuth, controller.syncSheet);
// Sắp xếp ngay trên trang công khai, chỉ số có cờ quản lý
router.get('/public/boards/:slug/pool', publicLimiter, bookingAuth, scheduling.managerListPool);
router.post('/public/requests/:requestId/detach', publicLimiter, bookingAuth, scheduling.managerDetachRequest);
router.post('/public/pool/:itemId/schedule', publicLimiter, bookingAuth, scheduling.managerScheduleFromPool);
router.delete('/public/pool/:itemId', publicLimiter, bookingAuth, scheduling.managerRemoveFromPool);
router.patch(
  '/public/registrants/:registrantId/color',
  publicLimiter,
  bookingAuth,
  controller.managerSetRegistrantColor
);
router.patch(
  '/public/registrants/:registrantId/price',
  publicLimiter,
  bookingAuth,
  controller.managerSetRegistrantPrice
);

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
router.get('/boards/:id/activity', auth, authorize('admin', 'teacher'), controller.listActivity);
router.post('/requests/review', auth, authorize('admin', 'teacher'), controller.reviewRequests);
// Tô màu buổi học: CHỈ admin. Giáo viên xem và duyệt được, nhưng màu là cách
// trung tâm xếp lớp trên lưới — để nhiều người đổi thì bảng màu hết ý nghĩa.
// Màu gắn với HỌC VIÊN (046), không còn gắn từng buổi. Chỉ admin: màu là cách
// trung tâm phân biệt người trên lưới, để nhiều người đổi thì bảng màu loạn.
router.patch('/registrants/:registrantId/color', auth, authorize('admin'), controller.setRegistrantColor);
router.post('/requests/color', auth, authorize('admin'), controller.setRequestsColor);
router.patch('/requests/:requestId', auth, authorize('admin', 'teacher'), controller.updateRequest);
router.delete('/requests/:requestId', auth, authorize('admin'), controller.adminCancelRequest);
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
// Gỡ một buổi khỏi lưới xuống khu chờ, và kéo ngược từ khu chờ vào lưới
router.post('/requests/:requestId/detach', ...admin, scheduling.detachRequestToPool);
router.post('/pool/:itemId/schedule', ...admin, scheduling.scheduleFromPool);

router.post('/slots/:slotId/assign', ...admin, scheduling.assignToSlot);
router.put('/entries/:entryId/price', ...admin, scheduling.updateEntryPrice);
router.post('/entries/:entryId/detach', ...admin, scheduling.detachToPool);
router.post('/entries/:entryId/move', ...admin, scheduling.moveEntry);

module.exports = router;

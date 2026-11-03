const multer = require('multer');
const bookingService = require('../services/booking.service');
const response = require('../utils/response');

// Ảnh chat: giữ trong RAM rồi đẩy thẳng lên Supabase Storage, không ghi
// tạm xuống đĩa — máy chủ Render có đĩa tạm, khởi động lại là mất.
const chatUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    if (error.statusCode) {
      return response.error(res, error.message, error.statusCode);
    }
    next(error);
  }
};

// --------------------------------------------------------------- công khai

const identify = handle(async (req, res) => {
  const result = await bookingService.identify(req.body || {});
  if (result.needs_name) {
    return response.success(res, result, 'Số này chưa đăng ký lần nào, vui lòng nhập họ tên');
  }
  return response.success(
    res,
    result,
    result.is_new ? 'Đăng ký thành công, mời chọn ca học' : `Chào ${result.registrant.full_name}`
  );
});

const getPublicBoard = handle(async (req, res) => {
  const result = await bookingService.getPublicBoard(
    req.params.slug,
    req.registrant?.id || null,
    req.query.week || null
  );
  return response.success(res, result, 'Lấy bảng đăng ký thành công');
});

const getMe = handle(async (req, res) => {
  const result = await bookingService.getMyRegistrant(req.registrant.id);
  return response.success(res, result, 'Lấy thông tin thành công');
});

const registerSlot = handle(async (req, res) => {
  const result = await bookingService.registerSlot(
    req.params.slotId,
    req.registrant.id,
    (req.body || {}).session_date
  );
  const message = result.already_booked
    ? 'Bạn đã đăng ký buổi này rồi'
    : result.status === 'waitlist'
      ? 'Ca đã đủ chỗ — bạn đang ở hàng chờ, có người hủy sẽ được xếp vào'
      : 'Đã giữ chỗ thành công';
  return response.success(res, result, message);
});

const createRequests = handle(async (req, res) => {
  const result = await bookingService.createRequests(
    req.params.slug,
    req.registrant.id,
    (req.body || {}).cells
  );
  const message = result.created === 0
    ? 'Những khung giờ này bạn đã gửi nguyện vọng rồi'
    : result.skipped > 0
      ? `Đã gửi nguyện vọng ${result.created} khung giờ (${result.skipped} khung đã gửi trước đó)`
      : `Đã gửi nguyện vọng ${result.created} khung giờ — trung tâm sẽ xem và mở lớp`;
  return response.created(res, result, message);
});

const cancelMyRequest = handle(async (req, res) => {
  const result = await bookingService.cancelRequest(req.params.requestId, req.registrant.id);
  return response.success(res, result, 'Đã rút nguyện vọng');
});

const cancelMyEntry = handle(async (req, res) => {
  const result = await bookingService.cancelEntry(req.params.entryId, req.registrant.id);
  return response.success(res, result, 'Đã hủy chỗ');
});

// --------------------------------------------------------------- quản trị

const listBoards = handle(async (req, res) => {
  const result = await bookingService.listBoards(req.query);
  return response.success(res, result.data, 'Lấy danh sách bảng thành công', 200, result.pagination);
});

const getBoardDetail = handle(async (req, res) => {
  const result = await bookingService.getBoardDetail(req.params.id, req.query.week || null);
  return response.success(res, result, 'Lấy chi tiết bảng thành công');
});

const createBoard = handle(async (req, res) => {
  const result = await bookingService.createBoard(req.body || {}, req.user);
  return response.created(res, result, 'Đã tạo bảng đăng ký');
});

const updateBoard = handle(async (req, res) => {
  const result = await bookingService.updateBoard(req.params.id, req.body || {});
  return response.success(res, result, 'Đã cập nhật bảng đăng ký');
});

const deleteBoard = handle(async (req, res) => {
  const result = await bookingService.deleteBoard(req.params.id);
  return response.success(res, result, 'Đã xóa bảng đăng ký');
});

const cloneBoard = handle(async (req, res) => {
  const result = await bookingService.cloneBoard(req.params.id, req.body || {}, req.user);
  return response.created(res, result, `Đã nhân bản sang tuần ${result.week_start} (${result.cloned_slots} ca)`);
});

const createSlot = handle(async (req, res) => {
  const result = await bookingService.createSlot(req.params.id, req.body || {}, req.user);
  return response.created(res, result, 'Đã thêm ca học');
});

const createSlotsBulk = handle(async (req, res) => {
  const result = await bookingService.createSlotsBulk(req.params.id, req.body || {}, req.user);
  return response.created(res, result, `Đã thêm ${result.length} ca học`);
});

const updateSlot = handle(async (req, res) => {
  const result = await bookingService.updateSlot(req.params.slotId, req.body || {});
  return response.success(res, result, 'Đã cập nhật ca học');
});

const deleteSlot = handle(async (req, res) => {
  const result = await bookingService.deleteSlot(req.params.slotId);
  return response.success(res, result, 'Đã xóa ca học');
});

const listRegistrations = handle(async (req, res) => {
  const result = await bookingService.listRegistrations(req.params.id, req.query);
  return response.success(res, result, 'Lấy danh sách đăng ký thành công');
});

const exportRegistrations = handle(async (req, res) => {
  const { filename, content } = await bookingService.exportRegistrationsCsv(req.params.id, req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(content);
});

const listRequests = handle(async (req, res) => {
  const result = await bookingService.listRequests(req.params.id, req.query);
  return response.success(res, result, 'Lấy danh sách nguyện vọng thành công');
});

const reviewRequests = handle(async (req, res) => {
  const { ids, status, review_note } = req.body || {};
  const result = await bookingService.reviewRequests(ids, status, req.user, review_note);
  return response.success(
    res,
    result,
    status === 'approved' ? `Đã duyệt ${result.updated} nguyện vọng` : `Đã từ chối ${result.updated} nguyện vọng`
  );
});

const updateMyRequest = handle(async (req, res) => {
  const result = await bookingService.updateRequest(req.params.requestId, req.body || {}, {
    registrantId: req.registrant.id,
  });
  return response.success(res, result, 'Đã lưu thay đổi');
});

const updateRequest = handle(async (req, res) => {
  const result = await bookingService.updateRequest(req.params.requestId, req.body || {}, {
    // Màu chỉ admin đổi được, giáo viên vẫn sửa được giờ và ghi chú
    canColor: req.user?.role === 'admin',
  });
  return response.success(res, result, 'Đã lưu thay đổi');
});

const listActivity = handle(async (req, res) => {
  const result = await bookingService.listActivity(req.params.id, req.query);
  return response.success(res, result, 'Lấy nhật ký thành công');
});

const listMyBoardActivity = handle(async (req, res) => {
  const result = await bookingService.listActivityBySlug(req.params.slug, req.registrant.id, req.query);
  return response.success(res, result, 'Lấy nhật ký thành công');
});

const listMessages = handle(async (req, res) => {
  const result = await bookingService.listMessages(
    req.params.slug,
    req.registrant.id,
    req.query.registrant_id || null
  );
  return response.success(res, result, 'Lấy tin nhắn thành công');
});

const sendMessage = handle(async (req, res) => {
  const result = await bookingService.sendMessage(
    req.params.slug,
    req.registrant.id,
    req.body || {},
    req.file || null
  );
  return response.success(res, result, 'Đã gửi');
});

const toggleReaction = handle(async (req, res) => {
  const result = await bookingService.toggleReaction(
    req.params.messageId,
    (req.body || {}).emoji,
    req.registrant.id
  );
  return response.success(res, result, result.added ? 'Đã thả cảm xúc' : 'Đã bỏ cảm xúc');
});

const listThreads = handle(async (req, res) => {
  const result = await bookingService.listThreads(req.params.slug, req.registrant.id);
  return response.success(res, result, 'Lấy danh sách hội thoại thành công');
});

const listBoardStudents = handle(async (req, res) => {
  const result = await bookingService.listBoardStudents(req.params.slug, req.registrant.id);
  return response.success(res, result, 'Lấy danh sách học viên thành công');
});

const managerSetRegistrantColor = handle(async (req, res) => {
  const result = await bookingService.managerSetRegistrantColor(
    req.params.registrantId,
    (req.body || {}).color,
    req.registrant.id
  );
  return response.success(res, result, `Đã đổi màu của ${result.full_name}`);
});

const setRegistrantColor = handle(async (req, res) => {
  const result = await bookingService.setRegistrantColor(req.params.registrantId, (req.body || {}).color);
  return response.success(res, result, `Đã đổi màu của ${result.full_name}`);
});

const adminCancelRequest = handle(async (req, res) => {
  const result = await bookingService.adminCancelRequest(req.params.requestId);
  return response.success(res, result, 'Đã hủy buổi đăng ký');
});

const setRequestsColor = handle(async (req, res) => {
  const { ids, color } = req.body || {};
  const result = await bookingService.setRequestsColor(ids, color);
  return response.success(
    res,
    result,
    result.color ? `Đã tô màu ${result.updated} buổi` : `Đã gỡ màu ${result.updated} buổi`
  );
});

const createSlotFromRequests = handle(async (req, res) => {
  const result = await bookingService.createSlotFromRequests(req.params.id, req.body || {}, req.user);
  return response.created(
    res,
    result,
    `Đã mở ca và duyệt ${result.approved_requests} nguyện vọng cho khung giờ này`
  );
});

const adminAddEntry = handle(async (req, res) => {
  const result = await bookingService.adminAddEntry(req.params.slotId, req.body || {});
  return response.created(res, result, 'Đã đăng ký hộ');
});

const adminCancelEntry = handle(async (req, res) => {
  const result = await bookingService.adminCancelEntry(req.params.entryId);
  return response.success(res, result, 'Đã hủy đăng ký');
});

module.exports = {
  chatImageUpload: chatUpload.single('image'),
  identify,
  getPublicBoard,
  getMe,
  registerSlot,
  cancelMyEntry,
  createRequests,
  cancelMyRequest,
  listBoards,
  getBoardDetail,
  createBoard,
  updateBoard,
  deleteBoard,
  cloneBoard,
  createSlot,
  createSlotsBulk,
  updateSlot,
  deleteSlot,
  listRegistrations,
  exportRegistrations,
  listRequests,
  reviewRequests,
  setRequestsColor,
  updateMyRequest,
  updateRequest,
  setRegistrantColor,
  listBoardStudents,
  listActivity,
  listMyBoardActivity,
  listMessages,
  sendMessage,
  listThreads,
  toggleReaction,
  managerSetRegistrantColor,
  adminCancelRequest,
  createSlotFromRequests,
  adminAddEntry,
  adminCancelEntry,
};

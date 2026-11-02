const bookingService = require('../services/booking.service');
const response = require('../utils/response');

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

const adminAddEntry = handle(async (req, res) => {
  const result = await bookingService.adminAddEntry(req.params.slotId, req.body || {});
  return response.created(res, result, 'Đã đăng ký hộ');
});

const adminCancelEntry = handle(async (req, res) => {
  const result = await bookingService.adminCancelEntry(req.params.entryId);
  return response.success(res, result, 'Đã hủy đăng ký');
});

module.exports = {
  identify,
  getPublicBoard,
  getMe,
  registerSlot,
  cancelMyEntry,
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
  adminAddEntry,
  adminCancelEntry,
};

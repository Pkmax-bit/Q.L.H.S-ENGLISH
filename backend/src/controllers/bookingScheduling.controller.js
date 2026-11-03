const svc = require('../services/bookingScheduling.service');
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

const listRegistrants = handle(async (req, res) => {
  const result = await svc.listRegistrants(req.query);
  return response.success(res, result, 'Lấy danh sách học viên đăng ký thành công');
});

// ---- mức giá ----

const listPriceTiers = handle(async (req, res) => {
  const result = await svc.listPriceTiers(req.params.registrantId);
  return response.success(res, result, 'Lấy mức giá thành công');
});

const createPriceTier = handle(async (req, res) => {
  const result = await svc.createPriceTier(req.params.registrantId, req.body || {}, req.user);
  return response.created(res, result, `Đã thêm mức giá "${result.name}"`);
});

const updatePriceTier = handle(async (req, res) => {
  const result = await svc.updatePriceTier(req.params.tierId, req.body || {});
  return response.success(res, result, 'Đã cập nhật mức giá');
});

const deletePriceTier = handle(async (req, res) => {
  const result = await svc.deletePriceTier(req.params.tierId);
  return response.success(
    res,
    result,
    result.detached_entries > 0
      ? `Đã xóa mức giá. ${result.detached_entries} buổi đã xếp vẫn giữ nguyên số tiền đã chốt.`
      : 'Đã xóa mức giá'
  );
});

// ---- giờ chờ sắp ----

const listPool = handle(async (req, res) => {
  const result = await svc.listPool(req.params.id);
  return response.success(res, result, 'Lấy giờ chờ sắp thành công');
});

const addToPool = handle(async (req, res) => {
  const result = await svc.addToPool(req.params.id, req.body || {}, req.user);
  return response.created(res, result, 'Đã thêm vào giờ chờ sắp');
});

const removeFromPool = handle(async (req, res) => {
  const result = await svc.removeFromPool(req.params.itemId);
  return response.success(res, result, 'Đã bỏ khỏi giờ chờ sắp');
});

// ---- xếp / gỡ / chuyển ----

const assignToSlot = handle(async (req, res) => {
  const result = await svc.assignToSlot(req.params.slotId, req.body || {}, req.user);
  return response.created(
    res,
    result,
    result.already_booked ? 'Người này đã có trong ca đó rồi' : 'Đã xếp vào ca'
  );
});

const updateEntryPrice = handle(async (req, res) => {
  const result = await svc.updateEntryPrice(req.params.entryId, (req.body || {}).price_tier_id);
  return response.success(res, result, 'Đã đổi mức giá');
});

const detachToPool = handle(async (req, res) => {
  const result = await svc.detachToPool(req.params.entryId, req.user);
  return response.success(res, result, 'Đã gỡ khỏi ca, chuyển xuống giờ chờ sắp');
});

const moveEntry = handle(async (req, res) => {
  const result = await svc.moveEntry(req.params.entryId, req.body || {}, req.user);
  return response.success(res, result, 'Đã chuyển sang ca mới');
});

module.exports = {
  listRegistrants,
  listPriceTiers,
  createPriceTier,
  updatePriceTier,
  deletePriceTier,
  listPool,
  addToPool,
  removeFromPool,
  assignToSlot,
  updateEntryPrice,
  detachToPool,
  moveEntry,
};

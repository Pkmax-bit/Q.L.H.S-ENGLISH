const shopService = require('../services/shop.service');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const fail = (res, err) => {
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ success: false, message: err.message || 'Lỗi máy chủ', data: null });
};

exports.getWallet = async (req, res) => {
  try {
    const data = await shopService.getWallet(req.user.id);
    ok(res, data);
  } catch (err) {
    fail(res, err);
  }
};

exports.listItems = async (req, res) => {
  try {
    const data = await shopService.listItems(req.user.id, req.user.role);
    ok(res, data);
  } catch (err) {
    fail(res, err);
  }
};

exports.purchase = async (req, res) => {
  try {
    const data = await shopService.purchaseItem(req.user.id, req.params.id);
    ok(res, data);
  } catch (err) {
    fail(res, err);
  }
};

exports.listLedger = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 30;
    const data = await shopService.listLedger(req.user.id, limit);
    ok(res, data);
  } catch (err) {
    fail(res, err);
  }
};

exports.getPlayAccess = async (req, res) => {
  try {
    const data = await shopService.assertOwned(req.user.id, req.params.slug);
    if (!data.owned) {
      return res.status(403).json({
        success: false,
        message: 'Bạn chưa mua game này',
        data: { item: data.item, owned: false },
      });
    }
    ok(res, data);
  } catch (err) {
    fail(res, err);
  }
};

exports.getSave = async (req, res) => {
  try {
    const data = await shopService.getGameSave(req.user.id, req.params.slug);
    ok(res, data);
  } catch (err) {
    fail(res, err);
  }
};

exports.putSave = async (req, res) => {
  try {
    const saveData = req.body?.save_data ?? req.body;
    const data = await shopService.upsertGameSave(req.user.id, req.params.slug, saveData);
    ok(res, data);
  } catch (err) {
    fail(res, err);
  }
};

exports.deleteSave = async (req, res) => {
  try {
    const data = await shopService.deleteGameSave(req.user.id, req.params.slug);
    ok(res, data);
  } catch (err) {
    fail(res, err);
  }
};

exports.getContent = async (req, res) => {
  try {
    const data = await shopService.getGameContent(req.params.slug, req.user);
    ok(res, data);
  } catch (err) {
    fail(res, err);
  }
};

exports.putContent = async (req, res) => {
  try {
    const payload = req.body?.payload ?? req.body;
    const data = await shopService.putGameContent(req.params.slug, payload, req.user.id);
    ok(res, data);
  } catch (err) {
    fail(res, err);
  }
};

exports.resetContent = async (req, res) => {
  try {
    const data = await shopService.resetGameContent(req.params.slug, req.user.id);
    ok(res, data);
  } catch (err) {
    fail(res, err);
  }
};

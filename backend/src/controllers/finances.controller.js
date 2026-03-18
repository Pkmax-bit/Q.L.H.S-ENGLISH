const financesService = require('../services/finances.service');
const response = require('../utils/response');
const { exportToExcel } = require('../utils/excel');
const { emitNotification } = require('../socket');

const getAll = async (req, res, next) => {
  try {
    const result = await financesService.getAll(req.query);
    return response.success(res, result.data, 'Finances retrieved', 200, result.pagination);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const finance = await financesService.getById(req.params.id);
    if (!finance) {
      return response.notFound(res, 'Finance record not found');
    }
    return response.success(res, finance, 'Finance record retrieved');
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const data = { ...req.body, created_by: req.user.id };
    const finance = await financesService.create(data);
    emitNotification('finance:created', finance);
    return response.created(res, finance, 'Finance record created successfully');
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const finance = await financesService.update(req.params.id, req.body);
    if (!finance) {
      return response.notFound(res, 'Finance record not found');
    }
    emitNotification('finance:updated', finance);
    return response.success(res, finance, 'Finance record updated successfully');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await financesService.remove(req.params.id);
    if (!result) {
      return response.notFound(res, 'Finance record not found');
    }
    emitNotification('finance:deleted', { id: req.params.id });
    return response.success(res, null, 'Finance record deleted successfully');
  } catch (error) {
    next(error);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const summary = await financesService.getSummary(start_date, end_date);
    return response.success(res, summary, 'Finance summary retrieved');
  } catch (error) {
    next(error);
  }
};

const exportExcel = async (req, res, next) => {
  try {
    const data = await financesService.getAllForExport(req.query);
    const columns = [
      { key: 'type', header: 'Type', width: 10 },
      { key: 'category', header: 'Category', width: 20 },
      { key: 'amount', header: 'Amount', width: 15 },
      { key: 'description', header: 'Description', width: 30 },
      { key: 'payment_date', header: 'Payment Date', width: 15 },
      { key: 'payment_method', header: 'Payment Method', width: 15 },
      { key: 'status', header: 'Status', width: 12 },
    ];
    const buffer = exportToExcel(data, 'Finances', columns);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=finances.xlsx');
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll, getById, create, update, remove,
  getSummary, exportExcel,
};

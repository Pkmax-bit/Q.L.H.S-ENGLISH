const tuitionService = require('../services/tuition.service');
const response = require('../utils/response');
const { exportToExcel } = require('../utils/excel');
const { emitNotification } = require('../socket');

const getInvoices = async (req, res, next) => {
  try {
    const result = await tuitionService.getInvoices(req.query);
    return response.success(res, result.data, 'Invoices retrieved', 200, result.pagination);
  } catch (e) { next(e); }
};

const getInvoiceById = async (req, res, next) => {
  try {
    const inv = await tuitionService.getInvoiceById(req.params.id);
    if (!inv) return response.notFound(res, 'Invoice not found');
    return response.success(res, inv, 'Invoice retrieved');
  } catch (e) { next(e); }
};

const createInvoice = async (req, res, next) => {
  try {
    const inv = await tuitionService.createInvoice(req.body, req.user.id);
    emitNotification('tuition:invoice:created', inv);
    return response.created(res, inv, 'Invoice created');
  } catch (e) { next(e); }
};

const updateInvoice = async (req, res, next) => {
  try {
    const inv = await tuitionService.updateInvoice(req.params.id, req.body);
    if (!inv) return response.notFound(res, 'Invoice not found');
    emitNotification('tuition:invoice:updated', inv);
    return response.success(res, inv, 'Invoice updated');
  } catch (e) { next(e); }
};

const removeInvoice = async (req, res, next) => {
  try {
    const r = await tuitionService.removeInvoice(req.params.id);
    if (!r) return response.notFound(res, 'Invoice not found');
    emitNotification('tuition:invoice:deleted', { id: req.params.id });
    return response.success(res, null, 'Invoice deleted');
  } catch (e) { next(e); }
};

const generateInvoices = async (req, res, next) => {
  try {
    const { class_id, year_month, all_monthly } = req.body;
    if (!year_month) return response.badRequest(res, 'year_month is required (YYYY-MM)');
    let result;
    if (all_monthly) {
      result = await tuitionService.generateMonthlyInvoices(year_month, req.user.id);
    } else {
      if (!class_id) return response.badRequest(res, 'class_id is required');
      result = await tuitionService.generateInvoicesForClass(class_id, year_month, req.user.id);
    }
    emitNotification('tuition:invoice:generated', { year_month, summary: result });
    return response.success(res, result, 'Invoices generated');
  } catch (e) {
    return response.badRequest(res, e.message);
  }
};

const recordPayment = async (req, res, next) => {
  try {
    const r = await tuitionService.recordPayment(req.params.id, req.body, req.user.id);
    if (!r) return response.notFound(res, 'Invoice not found');
    emitNotification('tuition:payment:recorded', r);
    return response.created(res, r, 'Payment recorded');
  } catch (e) {
    return response.badRequest(res, e.message);
  }
};

const removePayment = async (req, res, next) => {
  try {
    const r = await tuitionService.removePayment(req.params.paymentId);
    if (!r) return response.notFound(res, 'Payment not found');
    emitNotification('tuition:payment:deleted', r);
    return response.success(res, r, 'Payment removed');
  } catch (e) { next(e); }
};

const getReceivables = async (req, res, next) => {
  try {
    const r = await tuitionService.getReceivablesReport(req.query);
    return response.success(res, r, 'Receivables retrieved');
  } catch (e) { next(e); }
};

const getRevenue = async (req, res, next) => {
  try {
    const r = await tuitionService.getRevenueReport(req.query);
    return response.success(res, r, 'Revenue retrieved');
  } catch (e) { next(e); }
};

const getStudentLedger = async (req, res, next) => {
  try {
    const r = await tuitionService.getStudentLedger(req.params.studentId);
    return response.success(res, r, 'Student ledger retrieved');
  } catch (e) { next(e); }
};

const exportReceivables = async (req, res, next) => {
  try {
    const r = await tuitionService.getReceivablesReport(req.query);
    const columns = [
      { key: 'invoice_no', header: 'Số HĐ', width: 18 },
      { key: 'student_name', header: 'Học sinh', width: 25 },
      { key: 'class_name', header: 'Lớp', width: 20 },
      { key: 'period_start', header: 'Từ ngày', width: 12 },
      { key: 'period_end', header: 'Đến ngày', width: 12 },
      { key: 'due_date', header: 'Hạn thanh toán', width: 14 },
      { key: 'total', header: 'Tổng tiền', width: 14 },
      { key: 'paid_amount', header: 'Đã thu', width: 14 },
      { key: 'balance', header: 'Còn lại', width: 14 },
      { key: 'status', header: 'Trạng thái', width: 12 },
    ];
    const buf = exportToExcel(r.rows, 'Receivables', columns);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=receivables.xlsx');
    return res.send(buf);
  } catch (e) { next(e); }
};

const getClassesSummary = async (req, res, next) => {
  try {
    const r = await tuitionService.getClassesSummary(req.query);
    return response.success(res, r, 'Classes fee summary retrieved');
  } catch (e) { next(e); }
};

const getClassStudents = async (req, res, next) => {
  try {
    const r = await tuitionService.getClassStudentsFeeStatus(req.params.classId, req.query);
    return response.success(res, r, 'Class students fee status retrieved');
  } catch (e) { next(e); }
};

const getClassFeeProjection = async (req, res, next) => {
  try {
    const r = await tuitionService.getClassFeeProjection(req.params.classId, req.user);
    if (!r) return response.notFound(res, 'Class not found');
    return response.success(res, r, 'Class fee projection retrieved');
  } catch (e) {
    if (e.statusCode === 403) return response.forbidden(res, e.message);
    next(e);
  }
};

module.exports = {
  getInvoices, getInvoiceById, createInvoice, updateInvoice, removeInvoice,
  generateInvoices, recordPayment, removePayment,
  getReceivables, getRevenue, getStudentLedger, exportReceivables,
  getClassesSummary, getClassStudents, getClassFeeProjection,
};

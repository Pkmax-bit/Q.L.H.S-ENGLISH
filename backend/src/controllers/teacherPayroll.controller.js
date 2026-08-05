const teacherPayrollService = require('../services/teacherPayroll.service');
const response = require('../utils/response');

const listEntries = async (req, res, next) => {
  try {
    const rows = await teacherPayrollService.listEntries(req.query);
    return response.success(res, rows, 'Pay entries retrieved');
  } catch (e) {
    next(e);
  }
};

const getTeacherSummary = async (req, res, next) => {
  try {
    const r = await teacherPayrollService.getTeacherSummary(req.params.teacherId, req.query);
    return response.success(res, r, 'Teacher payroll summary');
  } catch (e) {
    next(e);
  }
};

const generateEntries = async (req, res, next) => {
  try {
    const r = await teacherPayrollService.generateEntries(req.body, req.user.id);
    return response.success(res, r, 'Pay entries generated');
  } catch (e) {
    next(e);
  }
};

const payEntry = async (req, res, next) => {
  try {
    const r = await teacherPayrollService.payEntry(req.params.entryId, req.body, req.user.id);
    if (!r) return response.notFound(res, 'Entry not found');
    return response.success(res, r, 'Payment recorded');
  } catch (e) {
    next(e);
  }
};

const getFinanceOverview = async (req, res, next) => {
  try {
    const r = await teacherPayrollService.getFinanceOverview(req.query);
    return response.success(res, r, 'Finance overview');
  } catch (e) {
    next(e);
  }
};

module.exports = {
  listEntries,
  getTeacherSummary,
  generateEntries,
  payEntry,
  getFinanceOverview,
};

const dashboardService = require('../services/dashboard.service');
const response = require('../utils/response');

const getStats = async (req, res, next) => {
  try {
    const stats = await dashboardService.getStats();
    return response.success(res, stats, 'Dashboard stats retrieved');
  } catch (error) {
    next(error);
  }
};

const getRecentActivity = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const activities = await dashboardService.getRecentActivity(limit);
    return response.success(res, activities, 'Recent activities retrieved');
  } catch (error) {
    next(error);
  }
};

const getTeacherDashboard = async (req, res, next) => {
  try {
    const result = await dashboardService.getTeacherDashboard(req.user.id);
    return response.success(res, result, 'Teacher dashboard retrieved');
  } catch (error) {
    next(error);
  }
};

const getStudentDashboard = async (req, res, next) => {
  try {
    const result = await dashboardService.getStudentDashboard(req.user.id);
    return response.success(res, result, 'Student dashboard retrieved');
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats, getRecentActivity, getTeacherDashboard, getStudentDashboard };

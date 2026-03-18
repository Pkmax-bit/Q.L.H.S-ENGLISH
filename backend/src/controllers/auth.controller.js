const authService = require('../services/auth.service');
const response = require('../utils/response');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return response.badRequest(res, 'Email and password are required');
    }

    const result = await authService.login(email, password);
    return response.success(res, result, 'Login successful');
  } catch (error) {
    if (error.statusCode) {
      return response.error(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return response.badRequest(res, 'Refresh token is required');
    }

    const result = await authService.refresh(refreshToken);
    return response.success(res, result, 'Token refreshed successfully');
  } catch (error) {
    if (error.statusCode) {
      return response.error(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout();
    return response.success(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

const logoutAll = async (req, res, next) => {
  try {
    await authService.logoutAll();
    return response.success(res, null, 'Logged out from all devices');
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    return response.success(res, user, 'User info retrieved');
  } catch (error) {
    if (error.statusCode) {
      return response.error(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return response.badRequest(res, 'Current password and new password are required');
    }

    if (newPassword.length < 6) {
      return response.badRequest(res, 'New password must be at least 6 characters');
    }

    await authService.changePassword(req.user.id, currentPassword, newPassword);
    return response.success(res, null, 'Password changed successfully');
  } catch (error) {
    if (error.statusCode) {
      return response.error(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const register = async (req, res, next) => {
  try {
    const { email, password, role, fullName, phone } = req.body;

    if (!email || !password || !role || !fullName) {
      return response.badRequest(res, 'Email, password, role, and full name are required');
    }

    if (password.length < 6) {
      return response.badRequest(res, 'Password must be at least 6 characters');
    }

    if (!['admin', 'teacher', 'student'].includes(role)) {
      return response.badRequest(res, 'Role must be admin, teacher, or student');
    }

    const user = await authService.register({ email, password, role, fullName, phone });
    return response.created(res, user, 'User registered successfully');
  } catch (error) {
    if (error.statusCode) {
      return response.error(res, error.message, error.statusCode);
    }
    next(error);
  }
};

module.exports = { login, refresh, logout, logoutAll, getMe, changePassword, register };

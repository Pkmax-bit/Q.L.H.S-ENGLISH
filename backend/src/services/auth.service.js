const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/database');
const jwtConfig = require('../config/jwt');

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, fullName: user.full_name },
    jwtConfig.access.secret,
    { expiresIn: jwtConfig.access.expiresIn }
  );
};

const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

const login = async (email, password, deviceInfo, ipAddress) => {
  const result = await query(
    'SELECT id, email, password_hash, role, full_name, phone, avatar_url, is_active FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    throw { statusCode: 401, message: 'Invalid email or password' };
  }

  const user = result.rows[0];

  if (!user.is_active) {
    throw { statusCode: 403, message: 'Account is deactivated' };
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw { statusCode: 401, message: 'Invalid email or password' };
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + jwtConfig.refresh.expiresInMs);

  await query(
    'INSERT INTO refresh_tokens (user_id, token, device_info, ip_address, expires_at) VALUES ($1, $2, $3, $4, $5)',
    [user.id, refreshToken, deviceInfo, ipAddress, expiresAt]
  );

  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

  const { password_hash, ...userData } = user;

  return {
    user: userData,
    accessToken,
    refreshToken,
    expiresAt,
  };
};

const refresh = async (refreshToken, deviceInfo, ipAddress) => {
  const result = await query(
    `SELECT rt.*, u.id as user_id, u.email, u.role, u.full_name, u.is_active
     FROM refresh_tokens rt
     JOIN users u ON rt.user_id = u.id
     WHERE rt.token = $1 AND rt.is_revoked = false AND rt.expires_at > NOW()`,
    [refreshToken]
  );

  if (result.rows.length === 0) {
    throw { statusCode: 401, message: 'Invalid or expired refresh token' };
  }

  const tokenData = result.rows[0];

  if (!tokenData.is_active) {
    throw { statusCode: 403, message: 'Account is deactivated' };
  }

  await query(
    'UPDATE refresh_tokens SET is_revoked = true, revoked_at = NOW() WHERE id = $1',
    [tokenData.id]
  );

  const user = {
    id: tokenData.user_id,
    email: tokenData.email,
    role: tokenData.role,
    full_name: tokenData.full_name,
  };

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + jwtConfig.refresh.expiresInMs);

  await query(
    'INSERT INTO refresh_tokens (user_id, token, device_info, ip_address, expires_at) VALUES ($1, $2, $3, $4, $5)',
    [user.id, newRefreshToken, deviceInfo, ipAddress, expiresAt]
  );

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresAt,
  };
};

const logout = async (refreshToken) => {
  const result = await query(
    'UPDATE refresh_tokens SET is_revoked = true, revoked_at = NOW() WHERE token = $1 AND is_revoked = false RETURNING id',
    [refreshToken]
  );
  return result.rows.length > 0;
};

const logoutAll = async (userId) => {
  await query(
    'UPDATE refresh_tokens SET is_revoked = true, revoked_at = NOW() WHERE user_id = $1 AND is_revoked = false',
    [userId]
  );
};

const getMe = async (userId) => {
  const result = await query(
    'SELECT id, email, role, full_name, phone, avatar_url, is_active, last_login_at, created_at FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw { statusCode: 404, message: 'User not found' };
  }

  return result.rows[0];
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);

  if (result.rows.length === 0) {
    throw { statusCode: 404, message: 'User not found' };
  }

  const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!isValid) {
    throw { statusCode: 400, message: 'Current password is incorrect' };
  }

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  await query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [hashedPassword, userId]
  );

  await query(
    'UPDATE refresh_tokens SET is_revoked = true, revoked_at = NOW() WHERE user_id = $1 AND is_revoked = false',
    [userId]
  );
};

const register = async (userData) => {
  const { email, password, role, fullName, phone, createTeacher } = userData;

  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw { statusCode: 409, message: 'Email already exists' };
  }

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const result = await query(
    `INSERT INTO users (email, password_hash, role, full_name, phone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, role, full_name, phone, is_active, created_at`,
    [email, hashedPassword, role, fullName, phone]
  );

  const user = result.rows[0];

  if (createTeacher && role === 'teacher') {
    await query(
      `INSERT INTO teachers (user_id, full_name, phone, email, status, hire_date)
       VALUES ($1, $2, $3, $4, 'active', CURRENT_DATE)`,
      [user.id, fullName, phone, email]
    );
  }

  return user;
};

module.exports = {
  login,
  refresh,
  logout,
  logoutAll,
  getMe,
  changePassword,
  register,
};

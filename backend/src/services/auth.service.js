const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { supabase } = require('../config/database');
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
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, password_hash, role, full_name, phone, avatar_url, is_active')
    .eq('email', email)
    .single();

  if (error || !user) {
    throw { statusCode: 401, message: 'Invalid email or password' };
  }

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

  const { error: insertError } = await supabase
    .from('refresh_tokens')
    .insert({
      user_id: user.id,
      token: refreshToken,
      device_info: deviceInfo,
      ip_address: ipAddress,
      expires_at: expiresAt.toISOString(),
    });
  if (insertError) throw insertError;

  const { error: updateError } = await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', user.id);
  if (updateError) throw updateError;

  const { password_hash, ...userData } = user;

  return {
    user: userData,
    accessToken,
    refreshToken,
    expiresAt,
  };
};

const refresh = async (refreshToken, deviceInfo, ipAddress) => {
  // Get the refresh token with user data
  const { data: tokenData, error: tokenError } = await supabase
    .from('refresh_tokens')
    .select('*')
    .eq('token', refreshToken)
    .eq('is_revoked', false)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (tokenError || !tokenData) {
    throw { statusCode: 401, message: 'Invalid or expired refresh token' };
  }

  // Get user data
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, role, full_name, is_active')
    .eq('id', tokenData.user_id)
    .single();

  if (userError || !user) {
    throw { statusCode: 401, message: 'Invalid or expired refresh token' };
  }

  if (!user.is_active) {
    throw { statusCode: 403, message: 'Account is deactivated' };
  }

  // Revoke old token
  const { error: revokeError } = await supabase
    .from('refresh_tokens')
    .update({ is_revoked: true, revoked_at: new Date().toISOString() })
    .eq('id', tokenData.id);
  if (revokeError) throw revokeError;

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + jwtConfig.refresh.expiresInMs);

  const { error: insertError } = await supabase
    .from('refresh_tokens')
    .insert({
      user_id: user.id,
      token: newRefreshToken,
      device_info: deviceInfo,
      ip_address: ipAddress,
      expires_at: expiresAt.toISOString(),
    });
  if (insertError) throw insertError;

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresAt,
  };
};

const logout = async (refreshToken) => {
  const { data, error } = await supabase
    .from('refresh_tokens')
    .update({ is_revoked: true, revoked_at: new Date().toISOString() })
    .eq('token', refreshToken)
    .eq('is_revoked', false)
    .select('id');

  if (error) throw error;
  return data && data.length > 0;
};

const logoutAll = async (userId) => {
  const { error } = await supabase
    .from('refresh_tokens')
    .update({ is_revoked: true, revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_revoked', false);
  if (error) throw error;
};

const getMe = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role, full_name, phone, avatar_url, is_active, last_login_at, created_at')
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw { statusCode: 404, message: 'User not found' };
  }

  return data;
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw { statusCode: 404, message: 'User not found' };
  }

  const isValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValid) {
    throw { statusCode: 400, message: 'Current password is incorrect' };
  }

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash: hashedPassword, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (updateError) throw updateError;

  // Revoke all refresh tokens
  const { error: revokeError } = await supabase
    .from('refresh_tokens')
    .update({ is_revoked: true, revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_revoked', false);
  if (revokeError) throw revokeError;
};

const register = async (userData) => {
  const { email, password, role, fullName, phone, createTeacher } = userData;

  // Check if email exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    throw { statusCode: 409, message: 'Email already exists' };
  }

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const { data: user, error } = await supabase
    .from('users')
    .insert({
      email,
      password_hash: hashedPassword,
      role,
      full_name: fullName,
      phone,
    })
    .select('id, email, role, full_name, phone, is_active, created_at')
    .single();

  if (error) throw error;

  if (createTeacher && role === 'teacher') {
    const { error: teacherError } = await supabase
      .from('teachers')
      .insert({
        user_id: user.id,
        full_name: fullName,
        phone,
        email,
        status: 'active',
        hire_date: new Date().toISOString().split('T')[0],
      });
    if (teacherError) throw teacherError;
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

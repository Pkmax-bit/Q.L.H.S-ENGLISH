const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/database');
const jwtConfig = require('../config/jwt');

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, fullName: user.full_name },
    jwtConfig.access.secret,
    { expiresIn: jwtConfig.access.expiresIn }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, type: 'refresh' },
    jwtConfig.refresh.secret,
    { expiresIn: jwtConfig.refresh.expiresIn }
  );
};

const login = async (email, password) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  const { data: user, error } = await supabase
    .from('profiles')
    .select('id, email, password_hash, role, full_name, phone, avatar_url, is_active')
    .eq('email', normalizedEmail)
    .single();

  if (error) {
    const msg = error.message || '';
    if (msg.includes('fetch failed') || error.code === '' || error.details?.includes('fetch failed')) {
      throw {
        statusCode: 503,
        message: 'Không kết nối được cơ sở dữ liệu. Kiểm tra mạng và SUPABASE_URL trong backend/.env',
      };
    }
    if (error.code !== 'PGRST116') {
      throw { statusCode: 503, message: 'Lỗi truy vấn tài khoản. Thử lại sau hoặc kiểm tra Supabase.' };
    }
  }

  if (!user) {
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
  const refreshToken = generateRefreshToken(user);
  const expiresAt = new Date(Date.now() + jwtConfig.refresh.expiresInMs);

  // Update updated_at as a "last login" indicator
  await supabase
    .from('profiles')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', user.id);

  const { password_hash, ...userData } = user;

  return {
    user: userData,
    accessToken,
    refreshToken,
    expiresAt,
  };
};

const refresh = async (refreshToken) => {
  // Stateless refresh: just verify the JWT signature
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, jwtConfig.refresh.secret);
  } catch (err) {
    throw { statusCode: 401, message: 'Invalid or expired refresh token' };
  }

  if (decoded.type !== 'refresh') {
    throw { statusCode: 401, message: 'Invalid token type' };
  }

  // Verify user still exists and is active
  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('id, email, role, full_name, is_active')
    .eq('id', decoded.id)
    .single();

  if (userError || !user) {
    throw { statusCode: 401, message: 'Invalid or expired refresh token' };
  }

  if (!user.is_active) {
    throw { statusCode: 403, message: 'Account is deactivated' };
  }

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);
  const expiresAt = new Date(Date.now() + jwtConfig.refresh.expiresInMs);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresAt,
  };
};

const logout = async () => {
  // Stateless JWT — logout is handled client-side by discarding tokens
  return true;
};

const logoutAll = async () => {
  // Stateless JWT — no server-side token store to invalidate
  // Client should discard tokens
  return true;
};

const getMe = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, full_name, phone, avatar_url, cover_url, bio, is_active, created_at, updated_at')
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw { statusCode: 404, message: 'User not found' };
  }

  return data;
};

const updateMe = async (userId, payload) => {
  const updateObj = { updated_at: new Date().toISOString() };

  if (payload.full_name !== undefined) {
    const name = String(payload.full_name || '').trim();
    if (!name) throw { statusCode: 400, message: 'Họ tên không được để trống' };
    updateObj.full_name = name;
  }
  if (payload.phone !== undefined) {
    updateObj.phone = String(payload.phone || '').trim() || null;
  }
  if (payload.bio !== undefined) {
    updateObj.bio = String(payload.bio || '').trim().slice(0, 500) || null;
  }
  if (payload.avatar_url !== undefined) {
    updateObj.avatar_url = payload.avatar_url || null;
  }
  if (payload.cover_url !== undefined) {
    updateObj.cover_url = payload.cover_url || null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updateObj)
    .eq('id', userId)
    .select('id, email, role, full_name, phone, avatar_url, cover_url, bio, is_active, created_at, updated_at')
    .single();

  if (error) throw error;
  return data;
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const { data: user, error } = await supabase
    .from('profiles')
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
    .from('profiles')
    .update({ password_hash: hashedPassword, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (updateError) throw updateError;
};

const register = async (userData) => {
  const { email, password, role, fullName, phone } = userData;

  // Check if email exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    throw { statusCode: 409, message: 'Email already exists' };
  }

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const { data: user, error } = await supabase
    .from('profiles')
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

  return user;
};

module.exports = {
  login,
  refresh,
  logout,
  logoutAll,
  getMe,
  updateMe,
  changePassword,
  register,
};

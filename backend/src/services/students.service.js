const { supabase } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['full_name', 'email', 'is_active', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const isActiveFilter = queryParams.is_active;

  // Count query
  let countQuery = supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'student');
  if (search) {
    countQuery = countQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }
  if (isActiveFilter !== undefined) {
    countQuery = countQuery.eq('is_active', isActiveFilter === 'true');
  }
  const { count: total, error: countError } = await countQuery;
  if (countError) throw countError;

  // Data query
  let dataQuery = supabase
    .from('profiles')
    .select('id, email, full_name, role, phone, avatar_url, is_active, created_at, updated_at')
    .eq('role', 'student');

  if (search) {
    dataQuery = dataQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }
  if (isActiveFilter !== undefined) {
    dataQuery = dataQuery.eq('is_active', isActiveFilter === 'true');
  }

  dataQuery = dataQuery
    .order(sort, { ascending: sortOrder === 'ASC' })
    .range(offset, offset + limit - 1);

  const { data, error } = await dataQuery;
  if (error) throw error;

  return {
    data: data || [],
    pagination: buildPaginationResponse(total || 0, page, limit),
  };
};

const getById = async (id) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, phone, avatar_url, is_active, created_at, updated_at')
    .eq('id', id)
    .eq('role', 'student')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

const create = async (data) => {
  const bcrypt = require('bcryptjs');
  const { full_name, phone, email, password, avatar_url } = data;

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  const password_hash = await bcrypt.hash(password || 'changeme123', saltRounds);

  const { data: row, error } = await supabase
    .from('profiles')
    .insert({
      full_name,
      phone,
      email,
      password_hash,
      role: 'student',
      avatar_url,
      is_active: true,
    })
    .select('id, email, full_name, role, phone, avatar_url, is_active, created_at, updated_at')
    .single();

  if (error) throw error;
  return row;
};

const update = async (id, data) => {
  const { full_name, phone, email, avatar_url, is_active } = data;

  const updateObj = {};
  if (full_name !== undefined) updateObj.full_name = full_name;
  if (phone !== undefined) updateObj.phone = phone;
  if (email !== undefined) updateObj.email = email;
  if (avatar_url !== undefined) updateObj.avatar_url = avatar_url;
  if (is_active !== undefined) updateObj.is_active = is_active;
  updateObj.updated_at = new Date().toISOString();

  const { data: row, error } = await supabase
    .from('profiles')
    .update(updateObj)
    .eq('id', id)
    .eq('role', 'student')
    .select('id, email, full_name, role, phone, avatar_url, is_active, created_at, updated_at')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return row;
};

const remove = async (id) => {
  const { data, error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id)
    .eq('role', 'student')
    .select('id')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

const getClasses = async (studentId) => {
  const { data, error } = await supabase
    .from('class_students')
    .select(`
      enrolled_at,
      status,
      classes(
        *,
        subjects(name, code),
        profiles!classes_teacher_id_fkey(full_name)
      )
    `)
    .eq('student_id', studentId);

  if (error) throw error;

  return (data || []).map(row => {
    const cls = row.classes || {};
    const { subjects, profiles: teacher, ...classRest } = cls;
    return {
      ...classRest,
      enrolled_at: row.enrolled_at,
      enrollment_status: row.status,
      subject_name: subjects?.name || null,
      subject_code: subjects?.code || null,
      teacher_name: teacher?.full_name || null,
    };
  }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
};

const getAllForExport = async (queryParams) => {
  const { search } = parsePagination(queryParams);

  let query = supabase
    .from('profiles')
    .select('full_name, email, phone, is_active, created_at')
    .eq('role', 'student')
    .order('full_name', { ascending: true });

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

module.exports = { getAll, getById, create, update, remove, getClasses, getAllForExport };

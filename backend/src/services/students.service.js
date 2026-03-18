const { supabase } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['full_name', 'email', 'enrollment_date', 'status', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const statusFilter = queryParams.status || null;

  // Count query
  let countQuery = supabase.from('students').select('id', { count: 'exact', head: true });
  if (search) {
    countQuery = countQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,parent_name.ilike.%${search}%`);
  }
  if (statusFilter) {
    countQuery = countQuery.eq('status', statusFilter);
  }
  const { count: total, error: countError } = await countQuery;
  if (countError) throw countError;

  // Data query
  let dataQuery = supabase
    .from('students')
    .select('*');

  if (search) {
    dataQuery = dataQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,parent_name.ilike.%${search}%`);
  }
  if (statusFilter) {
    dataQuery = dataQuery.eq('status', statusFilter);
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
    .from('students')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

const create = async (data) => {
  const {
    full_name, date_of_birth, gender, phone, parent_phone,
    parent_name, email, address, enrollment_date, status, notes,
  } = data;

  const { data: row, error } = await supabase
    .from('students')
    .insert({
      full_name,
      date_of_birth,
      gender,
      phone,
      parent_phone,
      parent_name,
      email,
      address,
      enrollment_date,
      status: status || 'active',
      notes,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
};

const update = async (id, data) => {
  const {
    full_name, date_of_birth, gender, phone, parent_phone,
    parent_name, email, address, enrollment_date, status, notes,
  } = data;

  const updateObj = {};
  if (full_name !== undefined) updateObj.full_name = full_name;
  if (date_of_birth !== undefined) updateObj.date_of_birth = date_of_birth;
  if (gender !== undefined) updateObj.gender = gender;
  if (phone !== undefined) updateObj.phone = phone;
  if (parent_phone !== undefined) updateObj.parent_phone = parent_phone;
  if (parent_name !== undefined) updateObj.parent_name = parent_name;
  if (email !== undefined) updateObj.email = email;
  if (address !== undefined) updateObj.address = address;
  if (enrollment_date !== undefined) updateObj.enrollment_date = enrollment_date;
  if (status !== undefined) updateObj.status = status;
  if (notes !== undefined) updateObj.notes = notes;
  updateObj.updated_at = new Date().toISOString();

  const { data: row, error } = await supabase
    .from('students')
    .update(updateObj)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return row;
};

const remove = async (id) => {
  const { data, error } = await supabase
    .from('students')
    .delete()
    .eq('id', id)
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
      classes(
        *,
        subjects(name),
        teachers!classes_homeroom_teacher_id_fkey(full_name)
      )
    `)
    .eq('student_id', studentId)
    .order('enrolled_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(row => {
    const cls = row.classes || {};
    return {
      ...cls,
      enrolled_at: row.enrolled_at,
      subject_name: cls.subjects?.name || null,
      teacher_name: cls.teachers?.full_name || null,
    };
  });
};

const getAllForExport = async (queryParams) => {
  const { search } = parsePagination(queryParams);

  let query = supabase
    .from('students')
    .select('full_name, date_of_birth, gender, phone, parent_phone, parent_name, email, address, enrollment_date, status')
    .order('full_name', { ascending: true });

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

module.exports = { getAll, getById, create, update, remove, getClasses, getAllForExport };

const { supabase } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['full_name', 'email', 'status', 'hire_date', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const statusFilter = queryParams.status || null;

  // Count query
  let countQuery = supabase.from('teachers').select('id', { count: 'exact', head: true });
  if (search) {
    countQuery = countQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,specialization.ilike.%${search}%`);
  }
  if (statusFilter) {
    countQuery = countQuery.eq('status', statusFilter);
  }
  const { count: total, error: countError } = await countQuery;
  if (countError) throw countError;

  // Data query
  let dataQuery = supabase
    .from('teachers')
    .select('*, users(email)');

  if (search) {
    dataQuery = dataQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,specialization.ilike.%${search}%`);
  }
  if (statusFilter) {
    dataQuery = dataQuery.eq('status', statusFilter);
  }

  dataQuery = dataQuery
    .order(sort, { ascending: sortOrder === 'ASC' })
    .range(offset, offset + limit - 1);

  const { data, error } = await dataQuery;
  if (error) throw error;

  // Flatten user_email
  const rows = (data || []).map(row => {
    const { users, ...rest } = row;
    return { ...rest, user_email: users?.email || null };
  });

  return {
    data: rows,
    pagination: buildPaginationResponse(total || 0, page, limit),
  };
};

const getById = async (id) => {
  const { data, error } = await supabase
    .from('teachers')
    .select('*, users(email)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const { users, ...rest } = data;
  return { ...rest, user_email: users?.email || null };
};

const create = async (data) => {
  const { full_name, phone, email, specialization, status, salary, hire_date, notes, user_id } = data;
  const { data: row, error } = await supabase
    .from('teachers')
    .insert({
      full_name,
      phone,
      email,
      specialization,
      status: status || 'active',
      salary,
      hire_date,
      notes,
      user_id,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
};

const update = async (id, data) => {
  const { full_name, phone, email, specialization, status, salary, hire_date, notes } = data;

  // Build update object with only provided fields (COALESCE equivalent)
  const updateObj = {};
  if (full_name !== undefined) updateObj.full_name = full_name;
  if (phone !== undefined) updateObj.phone = phone;
  if (email !== undefined) updateObj.email = email;
  if (specialization !== undefined) updateObj.specialization = specialization;
  if (status !== undefined) updateObj.status = status;
  if (salary !== undefined) updateObj.salary = salary;
  if (hire_date !== undefined) updateObj.hire_date = hire_date;
  if (notes !== undefined) updateObj.notes = notes;
  updateObj.updated_at = new Date().toISOString();

  const { data: row, error } = await supabase
    .from('teachers')
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
    .from('teachers')
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

const getClasses = async (teacherId) => {
  const { data, error } = await supabase
    .from('class_teachers')
    .select(`
      role,
      classes(
        *,
        subjects(name)
      )
    `)
    .eq('teacher_id', teacherId);

  if (error) throw error;

  // Flatten the result
  return (data || []).map(row => {
    const cls = row.classes || {};
    return {
      ...cls,
      teacher_role: row.role,
      subject_name: cls.subjects?.name || null,
    };
  });
};

const getSchedule = async (teacherId) => {
  const { data, error } = await supabase
    .from('schedule_slots')
    .select(`
      *,
      schedules!inner(name, is_active, classes(name)),
      rooms(name),
      subjects(name)
    `)
    .eq('teacher_id', teacherId)
    .eq('schedules.is_active', true)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw error;

  return (data || []).map(row => {
    const { schedules, rooms, subjects, ...rest } = row;
    return {
      ...rest,
      schedule_name: schedules?.name || null,
      room_name: rooms?.name || null,
      subject_name: subjects?.name || null,
      class_name: schedules?.classes?.name || null,
    };
  });
};

const getAllForExport = async (queryParams) => {
  const { search } = parsePagination(queryParams);

  let query = supabase
    .from('teachers')
    .select('full_name, email, phone, specialization, status, salary, hire_date')
    .order('full_name', { ascending: true });

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,specialization.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

module.exports = { getAll, getById, create, update, remove, getClasses, getSchedule, getAllForExport };

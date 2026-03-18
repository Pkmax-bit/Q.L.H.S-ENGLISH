const { supabase } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['name', 'status', 'start_date', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const statusFilter = queryParams.status || null;

  // Count query
  let countQuery = supabase.from('classes').select('id', { count: 'exact', head: true });
  if (search) {
    countQuery = countQuery.or(`name.ilike.%${search}%,notes.ilike.%${search}%`);
  }
  if (statusFilter) {
    countQuery = countQuery.eq('status', statusFilter);
  }
  const { count: total, error: countError } = await countQuery;
  if (countError) throw countError;

  // Data query - Supabase doesn't support subquery count in select,
  // so we fetch classes with joins and get student counts separately
  let dataQuery = supabase
    .from('classes')
    .select(`
      *,
      subjects(name, code),
      teachers!classes_homeroom_teacher_id_fkey(full_name)
    `);

  if (search) {
    dataQuery = dataQuery.or(`name.ilike.%${search}%,notes.ilike.%${search}%`);
  }
  if (statusFilter) {
    dataQuery = dataQuery.eq('status', statusFilter);
  }

  dataQuery = dataQuery
    .order(sort, { ascending: sortOrder === 'ASC' })
    .range(offset, offset + limit - 1);

  const { data, error } = await dataQuery;
  if (error) throw error;

  // Get student counts for these classes
  const classIds = (data || []).map(c => c.id);
  let studentCounts = {};
  if (classIds.length > 0) {
    const { data: csData, error: csError } = await supabase
      .from('class_students')
      .select('class_id')
      .in('class_id', classIds);
    if (csError) throw csError;

    for (const row of (csData || [])) {
      studentCounts[row.class_id] = (studentCounts[row.class_id] || 0) + 1;
    }
  }

  const rows = (data || []).map(row => {
    const { subjects, teachers, ...rest } = row;
    return {
      ...rest,
      subject_name: subjects?.name || null,
      subject_code: subjects?.code || null,
      homeroom_teacher_name: teachers?.full_name || null,
      student_count: studentCounts[row.id] || 0,
    };
  });

  return {
    data: rows,
    pagination: buildPaginationResponse(total || 0, page, limit),
  };
};

const getById = async (id) => {
  const { data, error } = await supabase
    .from('classes')
    .select(`
      *,
      subjects(name, code),
      teachers!classes_homeroom_teacher_id_fkey(full_name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  // Get student count
  const { count, error: countError } = await supabase
    .from('class_students')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', id);
  if (countError) throw countError;

  const { subjects, teachers, ...rest } = data;
  return {
    ...rest,
    subject_name: subjects?.name || null,
    subject_code: subjects?.code || null,
    homeroom_teacher_name: teachers?.full_name || null,
    student_count: count || 0,
  };
};

const create = async (data) => {
  const { name, subject_id, homeroom_teacher_id, max_students, status, start_date, end_date, notes } = data;
  const { data: row, error } = await supabase
    .from('classes')
    .insert({
      name,
      subject_id,
      homeroom_teacher_id,
      max_students: max_students || 30,
      status: status || 'active',
      start_date,
      end_date,
      notes,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
};

const update = async (id, data) => {
  const { name, subject_id, homeroom_teacher_id, max_students, status, start_date, end_date, notes } = data;

  const updateObj = {};
  if (name !== undefined) updateObj.name = name;
  if (subject_id !== undefined) updateObj.subject_id = subject_id;
  if (homeroom_teacher_id !== undefined) updateObj.homeroom_teacher_id = homeroom_teacher_id;
  if (max_students !== undefined) updateObj.max_students = max_students;
  if (status !== undefined) updateObj.status = status;
  if (start_date !== undefined) updateObj.start_date = start_date;
  if (end_date !== undefined) updateObj.end_date = end_date;
  if (notes !== undefined) updateObj.notes = notes;
  updateObj.updated_at = new Date().toISOString();

  const { data: row, error } = await supabase
    .from('classes')
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
    .from('classes')
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

const getStudents = async (classId) => {
  const { data, error } = await supabase
    .from('class_students')
    .select(`
      enrolled_at,
      students(*)
    `)
    .eq('class_id', classId);

  if (error) throw error;

  return (data || []).map(row => ({
    ...row.students,
    enrolled_at: row.enrolled_at,
  })).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
};

const addStudent = async (classId, studentId) => {
  // Check class capacity
  const { data: classInfo, error: classError } = await supabase
    .from('classes')
    .select('max_students')
    .eq('id', classId)
    .single();

  if (classError || !classInfo) {
    throw { statusCode: 404, message: 'Class not found' };
  }

  const { count, error: countError } = await supabase
    .from('class_students')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', classId);
  if (countError) throw countError;

  if (count >= classInfo.max_students) {
    throw { statusCode: 400, message: 'Class is full' };
  }

  // Upsert (ON CONFLICT DO NOTHING equivalent)
  const { data, error } = await supabase
    .from('class_students')
    .upsert(
      { class_id: classId, student_id: studentId },
      { onConflict: 'class_id,student_id', ignoreDuplicates: true }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
};

const removeStudent = async (classId, studentId) => {
  const { data, error } = await supabase
    .from('class_students')
    .delete()
    .eq('class_id', classId)
    .eq('student_id', studentId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

const getTeachers = async (classId) => {
  const { data, error } = await supabase
    .from('class_teachers')
    .select(`
      role,
      teachers(*)
    `)
    .eq('class_id', classId);

  if (error) throw error;

  return (data || []).map(row => ({
    ...row.teachers,
    class_role: row.role,
  })).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
};

const addTeacher = async (classId, teacherId, role = 'instructor') => {
  const { data, error } = await supabase
    .from('class_teachers')
    .upsert(
      { class_id: classId, teacher_id: teacherId, role },
      { onConflict: 'class_id,teacher_id', ignoreDuplicates: true }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
};

const removeTeacher = async (classId, teacherId) => {
  const { data, error } = await supabase
    .from('class_teachers')
    .delete()
    .eq('class_id', classId)
    .eq('teacher_id', teacherId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

module.exports = {
  getAll, getById, create, update, remove,
  getStudents, addStudent, removeStudent,
  getTeachers, addTeacher, removeTeacher,
};

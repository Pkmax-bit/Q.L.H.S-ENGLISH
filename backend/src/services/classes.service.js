const { supabase } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

const getAll = async (queryParams, currentUser = null) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['name', 'status', 'start_date', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const statusFilter = queryParams.status || null;

  // If student, get their enrolled class IDs first
  let enrolledClassIds = null;
  if (currentUser && currentUser.role === 'student') {
    const { data: enrollments, error: enrollError } = await supabase
      .from('class_students')
      .select('class_id')
      .eq('student_id', currentUser.id);
    if (enrollError) throw enrollError;
    enrolledClassIds = (enrollments || []).map(e => e.class_id);
    // If student has no classes, return empty
    if (enrolledClassIds.length === 0) {
      return {
        data: [],
        pagination: buildPaginationResponse(0, page, limit),
      };
    }
  }

  // Count query
  let countQuery = supabase.from('classes').select('id', { count: 'exact', head: true });
  if (search) {
    countQuery = countQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }
  if (statusFilter) {
    countQuery = countQuery.eq('status', statusFilter);
  }
  // Role-based filtering
  if (currentUser && currentUser.role === 'teacher') {
    countQuery = countQuery.eq('teacher_id', currentUser.id);
  }
  if (enrolledClassIds) {
    countQuery = countQuery.in('id', enrolledClassIds);
  }

  const { count: total, error: countError } = await countQuery;
  if (countError) throw countError;

  // Data query — join subjects and profiles (teacher)
  let dataQuery = supabase
    .from('classes')
    .select(`
      *,
      subjects(name, code),
      profiles!classes_teacher_id_fkey(full_name)
    `);

  if (search) {
    dataQuery = dataQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }
  if (statusFilter) {
    dataQuery = dataQuery.eq('status', statusFilter);
  }
  // Role-based filtering
  if (currentUser && currentUser.role === 'teacher') {
    dataQuery = dataQuery.eq('teacher_id', currentUser.id);
  }
  if (enrolledClassIds) {
    dataQuery = dataQuery.in('id', enrolledClassIds);
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
    const { subjects, profiles, ...rest } = row;
    return {
      ...rest,
      subject_name: subjects?.name || null,
      subject_code: subjects?.code || null,
      teacher_name: profiles?.full_name || null,
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
      profiles!classes_teacher_id_fkey(full_name)
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

  const { subjects, profiles, ...rest } = data;
  return {
    ...rest,
    subject_name: subjects?.name || null,
    subject_code: subjects?.code || null,
    teacher_name: profiles?.full_name || null,
    student_count: count || 0,
  };
};

const getOverview = async (classId) => {
  // 1. Class info
  const { data: classInfo, error: classErr } = await supabase
    .from('classes')
    .select(`*, subjects(name, code), profiles!classes_teacher_id_fkey(full_name, email, phone)`)
    .eq('id', classId)
    .single();
  if (classErr) {
    if (classErr.code === 'PGRST116') return null;
    throw classErr;
  }

  // 2. Students
  const { data: studentsRaw, error: studErr } = await supabase
    .from('class_students')
    .select(`id, enrolled_at, status, profiles!class_students_student_id_fkey(id, full_name, email, phone, avatar_url)`)
    .eq('class_id', classId);
  if (studErr) throw studErr;
  const students = (studentsRaw || []).map(r => ({
    ...(r.profiles || {}),
    enrollment_id: r.id,
    enrolled_at: r.enrolled_at,
    enrollment_status: r.status,
  })).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

  // 3. Lessons
  const { data: lessons, error: lesErr } = await supabase
    .from('lessons')
    .select('id, title, content_type, is_published, order_index, created_at')
    .eq('class_id', classId)
    .order('order_index', { ascending: true });
  if (lesErr) throw lesErr;

  // 4. Assignments with question count
  const { data: assignments, error: assErr } = await supabase
    .from('assignments')
    .select('id, title, assignment_type, due_date, total_points, is_published, time_limit_minutes, created_at')
    .eq('class_id', classId)
    .order('created_at', { ascending: false });
  if (assErr) throw assErr;

  const assignmentIds = (assignments || []).map(a => a.id);
  let questionCounts = {};
  if (assignmentIds.length > 0) {
    const { data: qData } = await supabase
      .from('assignment_questions')
      .select('assignment_id')
      .in('assignment_id', assignmentIds);
    for (const row of (qData || [])) {
      questionCounts[row.assignment_id] = (questionCounts[row.assignment_id] || 0) + 1;
    }
  }

  // 5. Submissions/Grades for all assignments in this class
  let grades = [];
  if (assignmentIds.length > 0) {
    const { data: subs, error: subErr } = await supabase
      .from('submissions')
      .select('id, assignment_id, student_id, status, score, submitted_at, graded_at')
      .in('assignment_id', assignmentIds);
    if (subErr) throw subErr;
    grades = subs || [];
  }

  // Build grade matrix: student → assignment → score
  const studentIds = students.map(s => s.id);
  const gradeMatrix = {};
  for (const s of students) {
    gradeMatrix[s.id] = { student: s, scores: {} };
  }
  for (const g of grades) {
    if (gradeMatrix[g.student_id]) {
      gradeMatrix[g.student_id].scores[g.assignment_id] = {
        submission_id: g.id,
        status: g.status,
        score: g.score,
        submitted_at: g.submitted_at,
        graded_at: g.graded_at,
      };
    }
  }

  // Stats
  const totalSubmissions = grades.length;
  const gradedSubmissions = grades.filter(g => g.status === 'graded').length;
  const avgScore = gradedSubmissions > 0
    ? (grades.filter(g => g.status === 'graded').reduce((sum, g) => sum + (g.score || 0), 0) / gradedSubmissions).toFixed(1)
    : null;

  const { subjects, profiles, ...classRest } = classInfo;

  return {
    classInfo: {
      ...classRest,
      subject_name: subjects?.name || null,
      subject_code: subjects?.code || null,
      teacher_name: profiles?.full_name || null,
      teacher_email: profiles?.email || null,
      teacher_phone: profiles?.phone || null,
    },
    students,
    lessons: lessons || [],
    assignments: (assignments || []).map(a => ({
      ...a,
      question_count: questionCounts[a.id] || 0,
    })),
    gradeMatrix: Object.values(gradeMatrix),
    stats: {
      student_count: students.length,
      lesson_count: (lessons || []).length,
      assignment_count: (assignments || []).length,
      total_submissions: totalSubmissions,
      graded_submissions: gradedSubmissions,
      avg_score: avgScore,
    },
  };
};

const create = async (data) => {
  const { name, subject_id, teacher_id, max_students, status, start_date, end_date, description } = data;
  const { data: row, error } = await supabase
    .from('classes')
    .insert({
      name,
      subject_id,
      teacher_id,
      max_students: max_students || 30,
      status: status || 'active',
      start_date,
      end_date,
      description,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
};

const update = async (id, data) => {
  const { name, subject_id, teacher_id, max_students, status, start_date, end_date, description } = data;

  const updateObj = {};
  if (name !== undefined) updateObj.name = name;
  if (subject_id !== undefined) updateObj.subject_id = subject_id;
  if (teacher_id !== undefined) updateObj.teacher_id = teacher_id;
  if (max_students !== undefined) updateObj.max_students = max_students;
  if (status !== undefined) updateObj.status = status;
  if (start_date !== undefined) updateObj.start_date = start_date;
  if (end_date !== undefined) updateObj.end_date = end_date;
  if (description !== undefined) updateObj.description = description;
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
      id,
      enrolled_at,
      status,
      profiles!class_students_student_id_fkey(id, email, full_name, phone, avatar_url, is_active)
    `)
    .eq('class_id', classId);

  if (error) throw error;

  return (data || []).map(row => ({
    ...(row.profiles || {}),
    enrollment_id: row.id,
    enrolled_at: row.enrolled_at,
    enrollment_status: row.status,
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

  // Check if already enrolled
  const { data: existing } = await supabase
    .from('class_students')
    .select('id')
    .eq('class_id', classId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (existing) {
    throw { statusCode: 409, message: 'Student already enrolled in this class' };
  }

  const { data, error } = await supabase
    .from('class_students')
    .insert({ class_id: classId, student_id: studentId })
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

const addStudentsBatch = async (classId, studentIds) => {
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

  const remaining = classInfo.max_students - (count || 0);
  if (remaining <= 0) {
    throw { statusCode: 400, message: 'Lớp đã đầy' };
  }

  // Filter out already enrolled
  const { data: existing } = await supabase
    .from('class_students')
    .select('student_id')
    .eq('class_id', classId)
    .in('student_id', studentIds);

  const existingIds = (existing || []).map(e => e.student_id);
  const newIds = studentIds.filter(id => !existingIds.includes(id));

  if (newIds.length === 0) {
    return { added: 0, skipped: studentIds.length, message: 'Tất cả học sinh đã có trong lớp' };
  }

  // Limit to remaining capacity
  const toAdd = newIds.slice(0, remaining);
  const rows = toAdd.map(student_id => ({ class_id: classId, student_id }));

  const { data, error } = await supabase
    .from('class_students')
    .insert(rows)
    .select();

  if (error) throw error;

  return {
    added: toAdd.length,
    skipped: existingIds.length,
    capacityExceeded: newIds.length > remaining ? newIds.length - remaining : 0,
  };
};

const removeStudentsBatch = async (classId, studentIds) => {
  const { data, error } = await supabase
    .from('class_students')
    .delete()
    .eq('class_id', classId)
    .in('student_id', studentIds)
    .select();

  if (error) throw error;

  return { removed: (data || []).length };
};

module.exports = {
  getAll, getById, getOverview, create, update, remove,
  getStudents, addStudent, addStudentsBatch, removeStudent, removeStudentsBatch,
};

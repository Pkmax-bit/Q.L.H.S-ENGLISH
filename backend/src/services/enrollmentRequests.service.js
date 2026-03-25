const { supabase } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');
const classesService = require('./classes.service');

/**
 * Get all enrollment requests with filters.
 * Admin sees all; teacher sees only their own requests.
 */
const getAll = async (queryParams, currentUser = null) => {
  const { page, limit, offset, sortBy, sortOrder } = parsePagination(queryParams);
  const statusFilter = queryParams.status || null;
  const classId = queryParams.class_id || null;

  // Count query
  let countQuery = supabase.from('enrollment_requests').select('id', { count: 'exact', head: true });
  if (statusFilter) countQuery = countQuery.eq('status', statusFilter);
  if (classId) countQuery = countQuery.eq('class_id', classId);
  if (currentUser && currentUser.role === 'teacher') {
    countQuery = countQuery.eq('requested_by', currentUser.id);
  }

  const { count: total, error: countError } = await countQuery;
  if (countError) throw countError;

  // Data query
  let dataQuery = supabase
    .from('enrollment_requests')
    .select(`
      *,
      classes(id, name),
      student:profiles!enrollment_requests_student_id_fkey(id, full_name, email, phone),
      requester:profiles!enrollment_requests_requested_by_fkey(id, full_name, role),
      reviewer:profiles!enrollment_requests_reviewed_by_fkey(id, full_name)
    `);

  if (statusFilter) dataQuery = dataQuery.eq('status', statusFilter);
  if (classId) dataQuery = dataQuery.eq('class_id', classId);
  if (currentUser && currentUser.role === 'teacher') {
    dataQuery = dataQuery.eq('requested_by', currentUser.id);
  }

  dataQuery = dataQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error } = await dataQuery;
  if (error) throw error;

  const rows = (data || []).map(row => ({
    id: row.id,
    class_id: row.class_id,
    class_name: row.classes?.name || null,
    student_id: row.student_id,
    student_name: row.student?.full_name || null,
    student_email: row.student?.email || null,
    student_phone: row.student?.phone || null,
    requested_by: row.requested_by,
    requester_name: row.requester?.full_name || null,
    requester_role: row.requester?.role || null,
    reviewed_by: row.reviewed_by,
    reviewer_name: row.reviewer?.full_name || null,
    status: row.status,
    note: row.note,
    review_note: row.review_note,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  return {
    data: rows,
    pagination: buildPaginationResponse(total || 0, page, limit),
  };
};

/**
 * Get pending count (for admin badge)
 */
const getPendingCount = async () => {
  const { count, error } = await supabase
    .from('enrollment_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) throw error;
  return count || 0;
};

/**
 * Create a new enrollment request (teacher submits).
 */
const create = async (data, currentUser) => {
  const { class_id, student_id, note } = data;

  // Verify teacher owns this class
  if (currentUser.role === 'teacher') {
    const { data: cls, error: clsError } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', class_id)
      .single();

    if (clsError || !cls) {
      throw { statusCode: 404, message: 'Lớp học không tồn tại' };
    }
    if (cls.teacher_id !== currentUser.id) {
      throw { statusCode: 403, message: 'Bạn không phải giáo viên phụ trách lớp này' };
    }
  }

  // Check if student already in class
  const { data: existing } = await supabase
    .from('class_students')
    .select('id')
    .eq('class_id', class_id)
    .eq('student_id', student_id)
    .maybeSingle();

  if (existing) {
    throw { statusCode: 409, message: 'Học sinh đã có trong lớp này rồi' };
  }

  // Check if there's already a pending request
  const { data: pendingReq } = await supabase
    .from('enrollment_requests')
    .select('id')
    .eq('class_id', class_id)
    .eq('student_id', student_id)
    .eq('status', 'pending')
    .maybeSingle();

  if (pendingReq) {
    throw { statusCode: 409, message: 'Đã có yêu cầu chờ duyệt cho học sinh này trong lớp' };
  }

  // Check class capacity
  const { data: classInfo } = await supabase
    .from('classes')
    .select('max_students')
    .eq('id', class_id)
    .single();

  if (classInfo) {
    const { count } = await supabase
      .from('class_students')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', class_id);

    if (count >= classInfo.max_students) {
      throw { statusCode: 400, message: 'Lớp đã đầy, không thể thêm học sinh' };
    }
  }

  const { data: row, error } = await supabase
    .from('enrollment_requests')
    .insert({
      class_id,
      student_id,
      requested_by: currentUser.id,
      note: note || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return row;
};

/**
 * Approve an enrollment request (admin only).
 * Automatically adds student to class.
 */
const approve = async (id, currentUser, reviewNote = null) => {
  // Get the request
  const { data: request, error: reqError } = await supabase
    .from('enrollment_requests')
    .select('*')
    .eq('id', id)
    .eq('status', 'pending')
    .single();

  if (reqError || !request) {
    throw { statusCode: 404, message: 'Yêu cầu không tồn tại hoặc đã được xử lý' };
  }

  // Add student to class
  await classesService.addStudent(request.class_id, request.student_id);

  // Update request status
  const { data: updated, error: updateError } = await supabase
    .from('enrollment_requests')
    .update({
      status: 'approved',
      reviewed_by: currentUser.id,
      review_note: reviewNote || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) throw updateError;
  return updated;
};

/**
 * Reject an enrollment request (admin only).
 */
const reject = async (id, currentUser, reviewNote = null) => {
  const { data: request, error: reqError } = await supabase
    .from('enrollment_requests')
    .select('id')
    .eq('id', id)
    .eq('status', 'pending')
    .single();

  if (reqError || !request) {
    throw { statusCode: 404, message: 'Yêu cầu không tồn tại hoặc đã được xử lý' };
  }

  const { data: updated, error: updateError } = await supabase
    .from('enrollment_requests')
    .update({
      status: 'rejected',
      reviewed_by: currentUser.id,
      review_note: reviewNote || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) throw updateError;
  return updated;
};

/**
 * Cancel a pending request (teacher can cancel their own).
 */
const cancel = async (id, currentUser) => {
  let query = supabase
    .from('enrollment_requests')
    .select('id, requested_by')
    .eq('id', id)
    .eq('status', 'pending');

  const { data: request, error: reqError } = await query.single();

  if (reqError || !request) {
    throw { statusCode: 404, message: 'Yêu cầu không tồn tại hoặc đã được xử lý' };
  }

  // Teacher can only cancel their own
  if (currentUser.role === 'teacher' && request.requested_by !== currentUser.id) {
    throw { statusCode: 403, message: 'Bạn chỉ có thể hủy yêu cầu của mình' };
  }

  const { error: deleteError } = await supabase
    .from('enrollment_requests')
    .delete()
    .eq('id', id);

  if (deleteError) throw deleteError;
  return { id };
};

module.exports = { getAll, getPendingCount, create, approve, reject, cancel };

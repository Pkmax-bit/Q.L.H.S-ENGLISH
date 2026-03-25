const { supabase } = require('../config/database');

/**
 * Get all lesson templates (is_template = true)
 * Admin sees all. Teacher sees only those they have permission for.
 */
const getLessonTemplates = async (queryParams, currentUser = null) => {
  const search = queryParams?.search || null;
  let query = supabase
    .from('lessons')
    .select('*')
    .eq('is_template', true)
    .order('order_index', { ascending: true });

  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  // If teacher, filter by permissions
  if (currentUser && currentUser.role === 'teacher') {
    return filterByPermissions(data || [], 'lesson', currentUser.id);
  }

  return data || [];
};

/**
 * Get all assignment templates
 */
const getAssignmentTemplates = async (queryParams, currentUser = null) => {
  const search = queryParams?.search || null;
  let query = supabase
    .from('assignments')
    .select('*, assignment_questions(*)')
    .eq('is_template', true)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  // If teacher, filter by permissions
  if (currentUser && currentUser.role === 'teacher') {
    return filterByPermissions(data || [], 'assignment', currentUser.id);
  }

  return data || [];
};

/**
 * Filter templates by teacher permissions.
 * A template is visible if:
 * 1. There's a permission with teacher_id = NULL (all teachers), OR
 * 2. There's a permission with teacher_id = currentTeacherId
 */
const filterByPermissions = async (templates, templateType, teacherId) => {
  if (templates.length === 0) return [];

  const templateIds = templates.map(t => t.id);

  const { data: permissions, error } = await supabase
    .from('template_permissions')
    .select('template_id, teacher_id')
    .eq('template_type', templateType)
    .in('template_id', templateIds);

  if (error) throw error;

  const allowedIds = new Set();
  (permissions || []).forEach(p => {
    // teacher_id = NULL means all teachers
    if (p.teacher_id === null || p.teacher_id === teacherId) {
      allowedIds.add(p.template_id);
    }
  });

  return templates.filter(t => allowedIds.has(t.id));
};

/**
 * Apply lesson templates to a class.
 */
const applyLessonTemplates = async (templateIds, classId, createdBy) => {
  const { data: templates, error: fetchErr } = await supabase
    .from('lessons')
    .select('*')
    .in('id', templateIds)
    .eq('is_template', true)
    .order('order_index', { ascending: true });

  if (fetchErr) throw fetchErr;
  if (!templates || templates.length === 0) {
    throw { statusCode: 404, message: 'Không tìm thấy mẫu bài học' };
  }

  const { data: existing } = await supabase
    .from('lessons')
    .select('order_index')
    .eq('class_id', classId)
    .eq('is_template', false)
    .order('order_index', { ascending: false })
    .limit(1);

  let nextOrder = (existing && existing[0]?.order_index || 0) + 1;

  const copies = templates.map((t) => ({
    class_id: classId,
    title: t.title,
    content: t.content,
    content_type: t.content_type,
    file_url: t.file_url,
    youtube_url: t.youtube_url,
    drive_url: t.drive_url,
    order_index: nextOrder++,
    is_published: false,
    is_template: false,
    created_by: createdBy,
  }));

  const { data: inserted, error: insertErr } = await supabase
    .from('lessons')
    .insert(copies)
    .select();

  if (insertErr) throw insertErr;
  return { created: inserted.length, lessons: inserted };
};

/**
 * Apply assignment templates to a class.
 */
const applyAssignmentTemplates = async (templateIds, classId, createdBy) => {
  const { data: templates, error: fetchErr } = await supabase
    .from('assignments')
    .select('*, assignment_questions(*)')
    .in('id', templateIds)
    .eq('is_template', true);

  if (fetchErr) throw fetchErr;
  if (!templates || templates.length === 0) {
    throw { statusCode: 404, message: 'Không tìm thấy mẫu bài tập' };
  }

  const results = [];

  for (const t of templates) {
    const { data: newAssignment, error: aErr } = await supabase
      .from('assignments')
      .insert({
        class_id: classId,
        title: t.title,
        description: t.description,
        assignment_type: t.assignment_type,
        total_points: t.total_points,
        time_limit_minutes: t.time_limit_minutes,
        is_published: false,
        is_template: false,
        created_by: createdBy,
      })
      .select()
      .single();

    if (aErr) throw aErr;

    const questions = t.assignment_questions || [];
    if (questions.length > 0) {
      const qCopies = questions.map((q) => ({
        assignment_id: newAssignment.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        correct_answer: q.correct_answer,
        points: q.points,
        order_index: q.order_index,
      }));

      const { error: qErr } = await supabase
        .from('assignment_questions')
        .insert(qCopies);

      if (qErr) throw qErr;
    }

    results.push({ ...newAssignment, questions_count: questions.length });
  }

  return { created: results.length, assignments: results };
};

const markAsTemplate = async (type, ids) => {
  const table = type === 'lesson' ? 'lessons' : 'assignments';
  const { data, error } = await supabase
    .from(table)
    .update({ is_template: true, updated_at: new Date().toISOString() })
    .in('id', ids)
    .select();

  if (error) throw error;
  return data;
};

const unmarkTemplate = async (type, ids) => {
  const table = type === 'lesson' ? 'lessons' : 'assignments';
  const { data, error } = await supabase
    .from(table)
    .update({ is_template: false, updated_at: new Date().toISOString() })
    .in('id', ids)
    .select();

  if (error) throw error;
  return data;
};

/**
 * Get template permissions for a specific template
 */
const getTemplatePermissions = async (templateType, templateId) => {
  const { data, error } = await supabase
    .from('template_permissions')
    .select(`
      *,
      teacher:profiles!template_permissions_teacher_id_fkey(id, full_name, email),
      granter:profiles!template_permissions_granted_by_fkey(id, full_name)
    `)
    .eq('template_type', templateType)
    .eq('template_id', templateId);

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    template_type: row.template_type,
    template_id: row.template_id,
    teacher_id: row.teacher_id,
    teacher_name: row.teacher?.full_name || null,
    teacher_email: row.teacher?.email || null,
    is_all_teachers: row.teacher_id === null,
    granted_by: row.granted_by,
    granter_name: row.granter?.full_name || null,
    created_at: row.created_at,
  }));
};

/**
 * Grant template permission.
 * teacher_id = null means all teachers.
 */
const grantPermission = async (templateType, templateId, teacherId, grantedBy) => {
  // Check if already exists
  let query = supabase
    .from('template_permissions')
    .select('id')
    .eq('template_type', templateType)
    .eq('template_id', templateId);

  if (teacherId) {
    query = query.eq('teacher_id', teacherId);
  } else {
    query = query.is('teacher_id', null);
  }

  const { data: existing } = await query.maybeSingle();
  if (existing) {
    throw { statusCode: 409, message: 'Quyền này đã tồn tại' };
  }

  const { data, error } = await supabase
    .from('template_permissions')
    .insert({
      template_type: templateType,
      template_id: templateId,
      teacher_id: teacherId || null,
      granted_by: grantedBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Revoke template permission
 */
const revokePermission = async (permissionId) => {
  const { data, error } = await supabase
    .from('template_permissions')
    .delete()
    .eq('id', permissionId)
    .select('id')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

/**
 * Bulk grant: allow all teachers for multiple templates at once
 */
const bulkGrantAllTeachers = async (templateType, templateIds, grantedBy) => {
  const rows = templateIds.map(id => ({
    template_type: templateType,
    template_id: id,
    teacher_id: null,
    granted_by: grantedBy,
  }));

  // Upsert (ignore conflicts)
  const { data, error } = await supabase
    .from('template_permissions')
    .upsert(rows, { onConflict: 'template_type,template_id,teacher_id', ignoreDuplicates: true })
    .select();

  if (error) throw error;
  return data;
};

module.exports = {
  getLessonTemplates,
  getAssignmentTemplates,
  applyLessonTemplates,
  applyAssignmentTemplates,
  markAsTemplate,
  unmarkTemplate,
  getTemplatePermissions,
  grantPermission,
  revokePermission,
  bulkGrantAllTeachers,
};

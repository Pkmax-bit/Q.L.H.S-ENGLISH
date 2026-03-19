const { supabase } = require('../config/database');

/**
 * Get all lesson templates (is_template = true, class_id is null or any)
 */
const getLessonTemplates = async (queryParams) => {
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
  return data || [];
};

/**
 * Get all assignment templates
 */
const getAssignmentTemplates = async (queryParams) => {
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
  return data || [];
};

/**
 * Apply lesson templates to a class.
 * Copies all template lessons into the target class.
 */
const applyLessonTemplates = async (templateIds, classId, createdBy) => {
  // Fetch all selected templates
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

  // Get current max order_index in the target class
  const { data: existing } = await supabase
    .from('lessons')
    .select('order_index')
    .eq('class_id', classId)
    .eq('is_template', false)
    .order('order_index', { ascending: false })
    .limit(1);

  let nextOrder = (existing && existing[0]?.order_index || 0) + 1;

  // Create copies
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
 * Copies assignments + their questions.
 */
const applyAssignmentTemplates = async (templateIds, classId, createdBy) => {
  // Fetch templates with questions
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
    // Copy assignment
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

    // Copy questions
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

/**
 * Convert existing lessons to templates (set is_template = true, clear class_id)
 */
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

/**
 * Remove template flag
 */
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

module.exports = {
  getLessonTemplates,
  getAssignmentTemplates,
  applyLessonTemplates,
  applyAssignmentTemplates,
  markAsTemplate,
  unmarkTemplate,
};

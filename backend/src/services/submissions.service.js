const { supabase } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

/**
 * Start a submission (student begins an assignment).
 */
const start = async (assignmentId, studentId) => {
  // Check if already has a non-in_progress submission
  const { data: existing } = await supabase
    .from('submissions')
    .select('id, status')
    .eq('assignment_id', assignmentId)
    .eq('student_id', studentId)
    .in('status', ['submitted', 'graded'])
    .maybeSingle();

  if (existing) {
    throw { statusCode: 409, message: 'Bạn đã nộp bài này rồi' };
  }

  // Check for in_progress — resume it
  const { data: inProgress } = await supabase
    .from('submissions')
    .select('*')
    .eq('assignment_id', assignmentId)
    .eq('student_id', studentId)
    .eq('status', 'in_progress')
    .maybeSingle();

  if (inProgress) {
    return inProgress;
  }

  // Get assignment info
  const { data: assignment, error: aErr } = await supabase
    .from('assignments')
    .select('id, total_points, is_published, due_date')
    .eq('id', assignmentId)
    .single();

  if (aErr || !assignment) {
    throw { statusCode: 404, message: 'Bài tập không tồn tại' };
  }

  if (!assignment.is_published) {
    throw { statusCode: 403, message: 'Bài tập chưa được xuất bản' };
  }

  // Create new submission
  const { data: row, error } = await supabase
    .from('submissions')
    .insert({
      assignment_id: assignmentId,
      student_id: studentId,
      status: 'in_progress',
      total_points: assignment.total_points,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return row;
};

/**
 * Submit answers and finalize.
 * Auto-grades multiple choice questions.
 */
const submit = async (submissionId, answers, studentId) => {
  // Verify ownership
  const { data: submission, error: sErr } = await supabase
    .from('submissions')
    .select('*, assignments(total_points, time_limit_minutes)')
    .eq('id', submissionId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (sErr) {
    console.error('[Submit] Error fetching submission:', sErr);
    throw { statusCode: 500, message: 'Lỗi khi lấy thông tin bài làm' };
  }

  if (!submission) {
    throw { statusCode: 404, message: 'Bài làm không tồn tại' };
  }

  if (submission.status !== 'in_progress') {
    throw { statusCode: 400, message: 'Bài đã được nộp rồi' };
  }

  // Get questions for this assignment
  const { data: questions, error: qErr } = await supabase
    .from('assignment_questions')
    .select('*')
    .eq('assignment_id', submission.assignment_id)
    .order('order_index', { ascending: true });

  if (qErr) {
    console.error('[Submit] Error fetching questions:', qErr);
    throw { statusCode: 500, message: 'Lỗi khi lấy câu hỏi' };
  }

  // Process answers + auto-grade MCQ
  let autoScore = 0;
  let hasEssay = false;
  const answerRows = [];

  for (const q of (questions || [])) {
    const answer = (answers || []).find(a => a.question_id === q.id);
    const answerText = answer?.answer_text || null;
    const selectedIndex = answer?.selected_option_index ?? null;

    let isCorrect = null;
    let questionScore = null;

    if (q.question_type === 'multiple_choice' && q.options) {
      // Auto-grade: check if selected option is correct
      const opts = Array.isArray(q.options) ? q.options : [];
      if (selectedIndex !== null && selectedIndex >= 0 && selectedIndex < opts.length) {
        isCorrect = opts[selectedIndex]?.is_correct === true;
        questionScore = isCorrect ? (q.points || 0) : 0;
        autoScore += questionScore;
      } else {
        isCorrect = false;
        questionScore = 0;
      }
    } else {
      // Essay — needs manual grading
      hasEssay = true;
    }

    answerRows.push({
      submission_id: submissionId,
      question_id: q.id,
      answer_text: answerText,
      selected_option_index: selectedIndex,
      is_correct: isCorrect,
      score: questionScore,
    });
  }

  // Insert/upsert answers
  if (answerRows.length > 0) {
    // Try upsert first, fallback to delete+insert
    const { error: insertErr } = await supabase
      .from('submission_answers')
      .upsert(answerRows, { onConflict: 'submission_id,question_id' });
    
    if (insertErr) {
      console.error('[Submit] Upsert error, trying delete+insert:', insertErr);
      // Fallback: delete existing answers and insert fresh
      await supabase
        .from('submission_answers')
        .delete()
        .eq('submission_id', submissionId);
      
      const { error: insertErr2 } = await supabase
        .from('submission_answers')
        .insert(answerRows);
      
      if (insertErr2) {
        console.error('[Submit] Insert error:', insertErr2);
        throw { statusCode: 500, message: 'Lỗi khi lưu câu trả lời: ' + (insertErr2.message || 'Unknown') };
      }
    }
  }

  // Calculate time spent
  const startedAt = new Date(submission.started_at);
  const now = new Date();
  const timeSpent = Math.floor((now - startedAt) / 1000);

  // Determine status: if no essay, auto-grade fully
  const finalStatus = hasEssay ? 'submitted' : 'graded';

  const updateData = {
    status: finalStatus,
    auto_score: autoScore,
    submitted_at: now.toISOString(),
    time_spent_seconds: timeSpent,
    updated_at: now.toISOString(),
  };

  if (!hasEssay) {
    updateData.score = autoScore;
    updateData.graded_at = now.toISOString();
  }

  const { data: updated, error: updateErr } = await supabase
    .from('submissions')
    .update(updateData)
    .eq('id', submissionId)
    .select()
    .single();

  if (updateErr) {
    console.error('[Submit] Update submission error:', updateErr);
    throw { statusCode: 500, message: 'Lỗi khi cập nhật bài nộp' };
  }
  return updated;
};

/**
 * Get submission detail with answers.
 */
const getById = async (submissionId) => {
  const { data, error } = await supabase
    .from('submissions')
    .select(`
      *,
      assignments(id, title, class_id, total_points, assignment_type, time_limit_minutes),
      profiles!submissions_student_id_fkey(id, full_name, email),
      grader:profiles!submissions_graded_by_fkey(id, full_name)
    `)
    .eq('id', submissionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  // Get answers with questions
  const { data: answers, error: aErr } = await supabase
    .from('submission_answers')
    .select(`
      *,
      assignment_questions(id, question_text, question_type, options, correct_answer, points, order_index, file_url, youtube_url)
    `)
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true });

  if (aErr) throw aErr;

  return {
    ...data,
    assignment_title: data.assignments?.title || null,
    student_name: data.profiles?.full_name || null,
    student_email: data.profiles?.email || null,
    grader_name: data.grader?.full_name || null,
    answers: (answers || []).map(a => ({
      ...a,
      question: a.assignment_questions || null,
    })).sort((a, b) => (a.question?.order_index ?? 0) - (b.question?.order_index ?? 0)),
  };
};

/**
 * Get student's submission for an assignment.
 */
const getByStudentAndAssignment = async (assignmentId, studentId) => {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('assignment_id', assignmentId)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * List submissions for an assignment (teacher/admin view).
 */
const getByAssignment = async (assignmentId, queryParams = {}) => {
  const { page, limit, offset } = parsePagination(queryParams);

  const { count: total, error: cErr } = await supabase
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('assignment_id', assignmentId)
    .neq('status', 'in_progress');
  if (cErr) throw cErr;

  const { data, error } = await supabase
    .from('submissions')
    .select(`
      *,
      profiles!submissions_student_id_fkey(id, full_name, email)
    `)
    .eq('assignment_id', assignmentId)
    .neq('status', 'in_progress')
    .order('submitted_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const rows = (data || []).map(row => ({
    ...row,
    student_name: row.profiles?.full_name || null,
    student_email: row.profiles?.email || null,
  }));

  return { data: rows, pagination: buildPaginationResponse(total || 0, page, limit) };
};

/**
 * List all submissions for a student.
 */
const getByStudent = async (studentId, queryParams = {}) => {
  const { page, limit, offset } = parsePagination(queryParams);
  const classId = queryParams.class_id || null;

  let countQuery = supabase
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .neq('status', 'in_progress');

  let dataQuery = supabase
    .from('submissions')
    .select(`
      *,
      assignments(id, title, class_id, total_points, due_date, assignment_type, classes(name))
    `)
    .eq('student_id', studentId)
    .neq('status', 'in_progress');

  if (classId) {
    // Filter by class_id through assignments
    const { data: classAssignments } = await supabase
      .from('assignments')
      .select('id')
      .eq('class_id', classId);
    const ids = (classAssignments || []).map(a => a.id);
    if (ids.length === 0) return { data: [], pagination: buildPaginationResponse(0, page, limit) };
    countQuery = countQuery.in('assignment_id', ids);
    dataQuery = dataQuery.in('assignment_id', ids);
  }

  const { count: total, error: cErr } = await countQuery;
  if (cErr) throw cErr;

  const { data, error } = await dataQuery
    .order('submitted_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const rows = (data || []).map(row => ({
    ...row,
    assignment_title: row.assignments?.title || null,
    class_name: row.assignments?.classes?.name || null,
    assignment_total_points: row.assignments?.total_points || null,
    assignment_type: row.assignments?.assignment_type || null,
  }));

  return { data: rows, pagination: buildPaginationResponse(total || 0, page, limit) };
};

/**
 * Teacher grades an essay answer or overall submission.
 */
const grade = async (submissionId, gradeData, gradedBy) => {
  const { answer_grades, feedback } = gradeData;

  // Get submission
  const { data: submission, error: sErr } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', submissionId)
    .single();
  if (sErr || !submission) throw { statusCode: 404, message: 'Bài nộp không tồn tại' };

  // Grade individual answers if provided
  let manualTotal = 0;
  if (answer_grades && Array.isArray(answer_grades)) {
    for (const ag of answer_grades) {
      const { answer_id, score, feedback: aFeedback } = ag;
      const { error } = await supabase
        .from('submission_answers')
        .update({
          score: score,
          feedback: aFeedback || null,
          is_correct: score > 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', answer_id)
        .eq('submission_id', submissionId);
      if (error) throw error;
      manualTotal += (score || 0);
    }
  }

  // Calculate total score = auto_score + manual grades
  const autoScore = submission.auto_score || 0;
  const totalScore = autoScore + manualTotal;

  const { data: updated, error: updateErr } = await supabase
    .from('submissions')
    .update({
      status: 'graded',
      score: totalScore,
      manual_score: manualTotal,
      feedback: feedback || null,
      graded_by: gradedBy,
      graded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', submissionId)
    .select()
    .single();

  if (updateErr) throw updateErr;
  return updated;
};

/**
 * Get grade book for a class (all assignments + all students).
 */
const getGradeBook = async (classId) => {
  // Get all assignments for this class
  const { data: assignments, error: aErr } = await supabase
    .from('assignments')
    .select('id, title, total_points, due_date, assignment_type')
    .eq('class_id', classId)
    .eq('is_published', true)
    .order('created_at', { ascending: true });
  if (aErr) throw aErr;

  // Get all students in this class
  const { data: enrollments, error: eErr } = await supabase
    .from('class_students')
    .select('student_id, profiles!class_students_student_id_fkey(id, full_name, email)')
    .eq('class_id', classId);
  if (eErr) throw eErr;

  const students = (enrollments || []).map(e => ({
    id: e.profiles?.id || e.student_id,
    full_name: e.profiles?.full_name || '—',
    email: e.profiles?.email || null,
  })).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

  const assignmentIds = (assignments || []).map(a => a.id);

  // Get all submissions for these assignments
  let submissions = [];
  if (assignmentIds.length > 0) {
    const { data: subs, error: sErr } = await supabase
      .from('submissions')
      .select('id, assignment_id, student_id, status, score, submitted_at')
      .in('assignment_id', assignmentIds)
      .neq('status', 'in_progress');
    if (sErr) throw sErr;
    submissions = subs || [];
  }

  // Build lookup: submissionMap[assignmentId][studentId] = submission
  const submissionMap = {};
  for (const sub of submissions) {
    if (!submissionMap[sub.assignment_id]) submissionMap[sub.assignment_id] = {};
    submissionMap[sub.assignment_id][sub.student_id] = sub;
  }

  return {
    assignments: assignments || [],
    students,
    submissionMap,
  };
};

module.exports = {
  start, submit, getById, getByStudentAndAssignment, getByAssignment,
  getByStudent, grade, getGradeBook,
};

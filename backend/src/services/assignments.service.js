const { supabase } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['title', 'assignment_type', 'total_points', 'due_date', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const classId = queryParams.class_id || null;
  const typeFilter = queryParams.assignment_type || null;
  const isPublished = queryParams.is_published;

  // Count query
  let countQuery = supabase.from('assignments').select('id', { count: 'exact', head: true });
  if (search) {
    countQuery = countQuery.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }
  if (classId) {
    countQuery = countQuery.eq('class_id', classId);
  }
  if (typeFilter) {
    countQuery = countQuery.eq('assignment_type', typeFilter);
  }
  if (isPublished !== undefined) {
    countQuery = countQuery.eq('is_published', isPublished === 'true');
  }
  const { count: total, error: countError } = await countQuery;
  if (countError) throw countError;

  // Data query
  let dataQuery = supabase
    .from('assignments')
    .select(`
      *,
      classes(name),
      lessons(title),
      profiles!assignments_created_by_fkey(full_name)
    `);

  if (search) {
    dataQuery = dataQuery.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }
  if (classId) {
    dataQuery = dataQuery.eq('class_id', classId);
  }
  if (typeFilter) {
    dataQuery = dataQuery.eq('assignment_type', typeFilter);
  }
  if (isPublished !== undefined) {
    dataQuery = dataQuery.eq('is_published', isPublished === 'true');
  }

  dataQuery = dataQuery
    .order(sort, { ascending: sortOrder === 'ASC' })
    .range(offset, offset + limit - 1);

  const { data, error } = await dataQuery;
  if (error) throw error;

  // Get question counts for these assignments
  const assignmentIds = (data || []).map(a => a.id);
  let questionCounts = {};
  if (assignmentIds.length > 0) {
    const { data: qData, error: qError } = await supabase
      .from('assignment_questions')
      .select('assignment_id')
      .in('assignment_id', assignmentIds);
    if (qError) throw qError;

    for (const row of (qData || [])) {
      questionCounts[row.assignment_id] = (questionCounts[row.assignment_id] || 0) + 1;
    }
  }

  const rows = (data || []).map(row => {
    const { classes, lessons, profiles, ...rest } = row;
    return {
      ...rest,
      class_name: classes?.name || null,
      lesson_title: lessons?.title || null,
      created_by_name: profiles?.full_name || null,
      question_count: questionCounts[row.id] || 0,
    };
  });

  return {
    data: rows,
    pagination: buildPaginationResponse(total || 0, page, limit),
  };
};

const getById = async (id) => {
  const { data, error } = await supabase
    .from('assignments')
    .select(`
      *,
      classes(name),
      lessons(title),
      profiles!assignments_created_by_fkey(full_name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const { classes, lessons, profiles, ...rest } = data;
  const assignment = {
    ...rest,
    class_name: classes?.name || null,
    lesson_title: lessons?.title || null,
    created_by_name: profiles?.full_name || null,
  };

  // Get questions — options are stored as JSONB in assignment_questions.options
  const { data: questions, error: qError } = await supabase
    .from('assignment_questions')
    .select('*')
    .eq('assignment_id', id)
    .order('order_index', { ascending: true });
  if (qError) throw qError;

  assignment.questions = questions || [];

  return assignment;
};

const create = async (data) => {
  const { title, class_id, lesson_id, description, assignment_type, due_date, total_points, is_published, is_template, time_limit_minutes, created_by } = data;
  const { data: row, error } = await supabase
    .from('assignments')
    .insert({
      title,
      class_id,
      lesson_id,
      description,
      assignment_type: assignment_type || 'mixed',
      due_date,
      total_points: total_points || 100,
      is_published: is_published || false,
      is_template: is_template || false,
      time_limit_minutes,
      created_by,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
};

const update = async (id, data) => {
  const { title, class_id, lesson_id, description, assignment_type, due_date, total_points, is_published, is_template, time_limit_minutes } = data;

  const updateObj = {};
  if (title !== undefined) updateObj.title = title;
  if (class_id !== undefined) updateObj.class_id = class_id;
  if (lesson_id !== undefined) updateObj.lesson_id = lesson_id;
  if (description !== undefined) updateObj.description = description;
  if (assignment_type !== undefined) updateObj.assignment_type = assignment_type;
  if (due_date !== undefined) updateObj.due_date = due_date;
  if (total_points !== undefined) updateObj.total_points = total_points;
  if (is_published !== undefined) updateObj.is_published = is_published;
  if (is_template !== undefined) updateObj.is_template = is_template;
  if (time_limit_minutes !== undefined) updateObj.time_limit_minutes = time_limit_minutes;
  updateObj.updated_at = new Date().toISOString();

  const { data: row, error } = await supabase
    .from('assignments')
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
    .from('assignments')
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

const addQuestion = async (assignmentId, data) => {
  const { question_text, question_type, options, correct_answer, points, order_index, file_url, youtube_url } = data;
  const { data: row, error } = await supabase
    .from('assignment_questions')
    .insert({
      assignment_id: assignmentId,
      question_text,
      question_type,
      options: options || null,
      correct_answer,
      points: points || 10,
      order_index: order_index || 0,
      file_url,
      youtube_url,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
};

const updateQuestion = async (questionId, data) => {
  const { question_text, question_type, options, correct_answer, points, order_index, file_url, youtube_url } = data;

  const updateObj = {};
  if (question_text !== undefined) updateObj.question_text = question_text;
  if (question_type !== undefined) updateObj.question_type = question_type;
  if (options !== undefined) updateObj.options = options;
  if (correct_answer !== undefined) updateObj.correct_answer = correct_answer;
  if (points !== undefined) updateObj.points = points;
  if (order_index !== undefined) updateObj.order_index = order_index;
  if (file_url !== undefined) updateObj.file_url = file_url;
  if (youtube_url !== undefined) updateObj.youtube_url = youtube_url;

  const { data: row, error } = await supabase
    .from('assignment_questions')
    .update(updateObj)
    .eq('id', questionId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return row;
};

const removeQuestion = async (questionId) => {
  const { data, error } = await supabase
    .from('assignment_questions')
    .delete()
    .eq('id', questionId)
    .select('id')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

module.exports = {
  getAll, getById, create, update, remove,
  addQuestion, updateQuestion, removeQuestion,
};

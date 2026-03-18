const { supabase } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['title', 'type', 'total_points', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const subjectId = queryParams.subject_id || null;
  const typeFilter = queryParams.type || null;

  // Count query
  let countQuery = supabase.from('assignments').select('id', { count: 'exact', head: true });
  if (search) {
    countQuery = countQuery.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
  }
  if (subjectId) {
    countQuery = countQuery.eq('subject_id', subjectId);
  }
  if (typeFilter) {
    countQuery = countQuery.eq('type', typeFilter);
  }
  const { count: total, error: countError } = await countQuery;
  if (countError) throw countError;

  // Data query
  let dataQuery = supabase
    .from('assignments')
    .select(`
      *,
      subjects(name),
      users!assignments_created_by_fkey(full_name)
    `);

  if (search) {
    dataQuery = dataQuery.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
  }
  if (subjectId) {
    dataQuery = dataQuery.eq('subject_id', subjectId);
  }
  if (typeFilter) {
    dataQuery = dataQuery.eq('type', typeFilter);
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
    const { subjects, users, ...rest } = row;
    return {
      ...rest,
      subject_name: subjects?.name || null,
      created_by_name: users?.full_name || null,
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
      subjects(name),
      users!assignments_created_by_fkey(full_name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const { subjects, users, ...rest } = data;
  const assignment = {
    ...rest,
    subject_name: subjects?.name || null,
    created_by_name: users?.full_name || null,
  };

  // Get questions
  const { data: questions, error: qError } = await supabase
    .from('assignment_questions')
    .select('*')
    .eq('assignment_id', id)
    .order('order_index', { ascending: true });
  if (qError) throw qError;

  // Get options for each question
  const questionIds = (questions || []).map(q => q.id);
  let optionsByQuestion = {};
  if (questionIds.length > 0) {
    const { data: options, error: oError } = await supabase
      .from('question_options')
      .select('*')
      .in('question_id', questionIds)
      .order('order_index', { ascending: true });
    if (oError) throw oError;

    for (const opt of (options || [])) {
      if (!optionsByQuestion[opt.question_id]) {
        optionsByQuestion[opt.question_id] = [];
      }
      optionsByQuestion[opt.question_id].push(opt);
    }
  }

  assignment.questions = (questions || []).map(q => ({
    ...q,
    options: optionsByQuestion[q.id] || [],
  }));

  // Get attachments
  const { data: attachments, error: attError } = await supabase
    .from('assignment_attachments')
    .select('*')
    .eq('assignment_id', id)
    .order('uploaded_at', { ascending: false });
  if (attError) throw attError;
  assignment.attachments = attachments || [];

  return assignment;
};

const create = async (data) => {
  const { title, subject_id, type, content, youtube_url, drive_url, total_points, created_by } = data;
  const { data: row, error } = await supabase
    .from('assignments')
    .insert({
      title,
      subject_id,
      type,
      content,
      youtube_url,
      drive_url,
      total_points,
      created_by,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
};

const update = async (id, data) => {
  const { title, subject_id, type, content, youtube_url, drive_url, total_points } = data;

  const updateObj = {};
  if (title !== undefined) updateObj.title = title;
  if (subject_id !== undefined) updateObj.subject_id = subject_id;
  if (type !== undefined) updateObj.type = type;
  if (content !== undefined) updateObj.content = content;
  if (youtube_url !== undefined) updateObj.youtube_url = youtube_url;
  if (drive_url !== undefined) updateObj.drive_url = drive_url;
  if (total_points !== undefined) updateObj.total_points = total_points;
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
  const { question_text, type, points, order_index } = data;
  const { data: row, error } = await supabase
    .from('assignment_questions')
    .insert({
      assignment_id: assignmentId,
      question_text,
      type,
      points,
      order_index,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
};

const updateQuestion = async (questionId, data) => {
  const { question_text, type, points, order_index } = data;

  const updateObj = {};
  if (question_text !== undefined) updateObj.question_text = question_text;
  if (type !== undefined) updateObj.type = type;
  if (points !== undefined) updateObj.points = points;
  if (order_index !== undefined) updateObj.order_index = order_index;

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

const addOption = async (questionId, data) => {
  const { option_text, is_correct, order_index } = data;
  const { data: row, error } = await supabase
    .from('question_options')
    .insert({
      question_id: questionId,
      option_text,
      is_correct: is_correct || false,
      order_index,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
};

const updateOption = async (optionId, data) => {
  const { option_text, is_correct, order_index } = data;

  const updateObj = {};
  if (option_text !== undefined) updateObj.option_text = option_text;
  if (is_correct !== undefined) updateObj.is_correct = is_correct;
  if (order_index !== undefined) updateObj.order_index = order_index;

  const { data: row, error } = await supabase
    .from('question_options')
    .update(updateObj)
    .eq('id', optionId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return row;
};

const removeOption = async (optionId) => {
  const { data, error } = await supabase
    .from('question_options')
    .delete()
    .eq('id', optionId)
    .select('id')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

const addAttachment = async (assignmentId, fileData) => {
  const { file_name, file_url, file_type, file_size } = fileData;
  const { data, error } = await supabase
    .from('assignment_attachments')
    .insert({
      assignment_id: assignmentId,
      file_name,
      file_url,
      file_type,
      file_size,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

const removeAttachment = async (attachmentId) => {
  const { data, error } = await supabase
    .from('assignment_attachments')
    .delete()
    .eq('id', attachmentId)
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
  addQuestion, updateQuestion, removeQuestion,
  addOption, updateOption, removeOption,
  addAttachment, removeAttachment,
};

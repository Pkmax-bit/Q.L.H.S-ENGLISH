const { supabase } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['title', 'order_index', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const subjectId = queryParams.subject_id || null;

  // Count query
  let countQuery = supabase.from('lessons').select('id', { count: 'exact', head: true });
  if (search) {
    countQuery = countQuery.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
  }
  if (subjectId) {
    countQuery = countQuery.eq('subject_id', subjectId);
  }
  const { count: total, error: countError } = await countQuery;
  if (countError) throw countError;

  // Data query
  let dataQuery = supabase
    .from('lessons')
    .select(`
      *,
      subjects(name),
      users!lessons_created_by_fkey(full_name)
    `);

  if (search) {
    dataQuery = dataQuery.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
  }
  if (subjectId) {
    dataQuery = dataQuery.eq('subject_id', subjectId);
  }

  dataQuery = dataQuery
    .order(sort, { ascending: sortOrder === 'ASC' })
    .range(offset, offset + limit - 1);

  const { data, error } = await dataQuery;
  if (error) throw error;

  const rows = (data || []).map(row => {
    const { subjects, users, ...rest } = row;
    return {
      ...rest,
      subject_name: subjects?.name || null,
      created_by_name: users?.full_name || null,
    };
  });

  return {
    data: rows,
    pagination: buildPaginationResponse(total || 0, page, limit),
  };
};

const getById = async (id) => {
  const { data, error } = await supabase
    .from('lessons')
    .select(`
      *,
      subjects(name),
      users!lessons_created_by_fkey(full_name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const { subjects, users, ...rest } = data;
  const lesson = {
    ...rest,
    subject_name: subjects?.name || null,
    created_by_name: users?.full_name || null,
  };

  // Get attachments
  const { data: attachments, error: attError } = await supabase
    .from('lesson_attachments')
    .select('*')
    .eq('lesson_id', id)
    .order('uploaded_at', { ascending: false });

  if (attError) throw attError;
  lesson.attachments = attachments || [];

  return lesson;
};

const create = async (data) => {
  const { title, subject_id, content, youtube_url, drive_url, order_index, created_by } = data;
  const { data: row, error } = await supabase
    .from('lessons')
    .insert({
      title,
      subject_id,
      content,
      youtube_url,
      drive_url,
      order_index,
      created_by,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
};

const update = async (id, data) => {
  const { title, subject_id, content, youtube_url, drive_url, order_index } = data;

  const updateObj = {};
  if (title !== undefined) updateObj.title = title;
  if (subject_id !== undefined) updateObj.subject_id = subject_id;
  if (content !== undefined) updateObj.content = content;
  if (youtube_url !== undefined) updateObj.youtube_url = youtube_url;
  if (drive_url !== undefined) updateObj.drive_url = drive_url;
  if (order_index !== undefined) updateObj.order_index = order_index;
  updateObj.updated_at = new Date().toISOString();

  const { data: row, error } = await supabase
    .from('lessons')
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
    .from('lessons')
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

const addAttachment = async (lessonId, fileData) => {
  const { file_name, file_url, file_type, file_size } = fileData;
  const { data, error } = await supabase
    .from('lesson_attachments')
    .insert({
      lesson_id: lessonId,
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
    .from('lesson_attachments')
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

module.exports = { getAll, getById, create, update, remove, addAttachment, removeAttachment };

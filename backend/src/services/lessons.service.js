const { supabase } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['title', 'order_index', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const classId = queryParams.class_id || null;
  const isPublished = queryParams.is_published;

  // Count query
  let countQuery = supabase.from('lessons').select('id', { count: 'exact', head: true });
  if (search) {
    countQuery = countQuery.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
  }
  if (classId) {
    countQuery = countQuery.eq('class_id', classId);
  }
  if (isPublished !== undefined) {
    countQuery = countQuery.eq('is_published', isPublished === 'true');
  }
  const { count: total, error: countError } = await countQuery;
  if (countError) throw countError;

  // Data query
  let dataQuery = supabase
    .from('lessons')
    .select(`
      *,
      classes(name),
      profiles!lessons_created_by_fkey(full_name)
    `);

  if (search) {
    dataQuery = dataQuery.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
  }
  if (classId) {
    dataQuery = dataQuery.eq('class_id', classId);
  }
  if (isPublished !== undefined) {
    dataQuery = dataQuery.eq('is_published', isPublished === 'true');
  }

  dataQuery = dataQuery
    .order(sort, { ascending: sortOrder === 'ASC' })
    .range(offset, offset + limit - 1);

  const { data, error } = await dataQuery;
  if (error) throw error;

  const rows = (data || []).map(row => {
    const { classes, profiles, ...rest } = row;
    return {
      ...rest,
      class_name: classes?.name || null,
      created_by_name: profiles?.full_name || null,
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
      classes(name),
      profiles!lessons_created_by_fkey(full_name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const { classes, profiles, ...rest } = data;
  return {
    ...rest,
    class_name: classes?.name || null,
    created_by_name: profiles?.full_name || null,
  };
};

const create = async (data) => {
  const { title, class_id, content, content_type, file_url, youtube_url, drive_url, order_index, is_published, is_template, created_by } = data;
  const { data: row, error } = await supabase
    .from('lessons')
    .insert({
      title,
      class_id,
      content,
      content_type: content_type || 'text',
      file_url,
      youtube_url,
      drive_url,
      order_index: order_index || 0,
      is_published: is_published || false,
      is_template: is_template || false,
      created_by,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
};

const update = async (id, data) => {
  const { title, class_id, content, content_type, file_url, youtube_url, drive_url, order_index, is_published, is_template } = data;

  const updateObj = {};
  if (title !== undefined) updateObj.title = title;
  if (class_id !== undefined) updateObj.class_id = class_id;
  if (content !== undefined) updateObj.content = content;
  if (content_type !== undefined) updateObj.content_type = content_type;
  if (file_url !== undefined) updateObj.file_url = file_url;
  if (youtube_url !== undefined) updateObj.youtube_url = youtube_url;
  if (drive_url !== undefined) updateObj.drive_url = drive_url;
  if (order_index !== undefined) updateObj.order_index = order_index;
  if (is_published !== undefined) updateObj.is_published = is_published;
  if (is_template !== undefined) updateObj.is_template = is_template;
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

module.exports = { getAll, getById, create, update, remove };

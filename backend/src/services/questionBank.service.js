const { supabase } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

const BUCKET = () => process.env.QUESTION_BANK_BUCKET || 'question-bank';

function sanitizeFilename(name) {
  const base = (name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.slice(0, 120) || 'file';
}

async function removeStoragePaths(paths) {
  const bucket = BUCKET();
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return;
  const { error } = await supabase.storage.from(bucket).remove(unique);
  if (error) throw error;
}

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['created_at', 'label', 'skill', 'question_type', 'points'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const skill = queryParams.skill || null;

  let countQuery = supabase.from('question_bank_items').select('id', { count: 'exact', head: true });
  if (search) {
    countQuery = countQuery.or(`label.ilike.%${search}%,question_text.ilike.%${search}%`);
  }
  if (skill) {
    countQuery = countQuery.eq('skill', skill);
  }
  const { count: total, error: countError } = await countQuery;
  if (countError) throw countError;

  let dataQuery = supabase
    .from('question_bank_items')
    .select(`
      *,
      profiles!question_bank_items_created_by_fkey(full_name)
    `);

  if (search) {
    dataQuery = dataQuery.or(`label.ilike.%${search}%,question_text.ilike.%${search}%`);
  }
  if (skill) {
    dataQuery = dataQuery.eq('skill', skill);
  }

  dataQuery = dataQuery
    .order(sort, { ascending: sortOrder === 'ASC' })
    .range(offset, offset + limit - 1);

  const { data, error } = await dataQuery;
  if (error) throw error;

  const rows = (data || []).map((row) => {
    const { profiles, ...rest } = row;
    return {
      ...rest,
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
    .from('question_bank_items')
    .select(`
      *,
      profiles!question_bank_items_created_by_fkey(full_name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const { profiles, ...rest } = data;
  return {
    ...rest,
    created_by_name: profiles?.full_name || null,
  };
};

const create = async (payload) => {
  const row = {
    created_by: payload.created_by,
    label: payload.label ?? null,
    question_text: payload.question_text ?? '',
    question_type: payload.question_type || 'multiple_choice',
    options: payload.options ?? null,
    correct_answer: payload.correct_answer ?? null,
    points: payload.points ?? 1,
    file_url: payload.file_url ?? null,
    youtube_url: payload.youtube_url ?? null,
    file_storage_path: payload.file_storage_path ?? null,
    audio_storage_path: payload.audio_storage_path ?? null,
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    skill: payload.skill ?? null,
  };

  const { data, error } = await supabase.from('question_bank_items').insert(row).select().single();
  if (error) throw error;
  return data;
};

const update = async (id, existing, payload) => {
  const updateObj = {};
  if (payload.label !== undefined) updateObj.label = payload.label;
  if (payload.question_text !== undefined) updateObj.question_text = payload.question_text;
  if (payload.question_type !== undefined) updateObj.question_type = payload.question_type;
  if (payload.options !== undefined) updateObj.options = payload.options;
  if (payload.correct_answer !== undefined) updateObj.correct_answer = payload.correct_answer;
  if (payload.points !== undefined) updateObj.points = payload.points;
  if (payload.file_url !== undefined) updateObj.file_url = payload.file_url;
  if (payload.youtube_url !== undefined) updateObj.youtube_url = payload.youtube_url;
  if (payload.file_storage_path !== undefined) updateObj.file_storage_path = payload.file_storage_path;
  if (payload.audio_storage_path !== undefined) updateObj.audio_storage_path = payload.audio_storage_path;
  if (payload.tags !== undefined) updateObj.tags = Array.isArray(payload.tags) ? payload.tags : [];
  if (payload.skill !== undefined) updateObj.skill = payload.skill;

  updateObj.updated_at = new Date().toISOString();

  const toRemove = [];
  if (
    payload.file_storage_path !== undefined &&
    existing.file_storage_path &&
    payload.file_storage_path !== existing.file_storage_path
  ) {
    toRemove.push(existing.file_storage_path);
  }
  if (
    payload.audio_storage_path !== undefined &&
    existing.audio_storage_path &&
    payload.audio_storage_path !== existing.audio_storage_path
  ) {
    toRemove.push(existing.audio_storage_path);
  }
  await removeStoragePaths(toRemove);

  const { data, error } = await supabase
    .from('question_bank_items')
    .update(updateObj)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

const remove = async (existing) => {
  await removeStoragePaths([existing.file_storage_path, existing.audio_storage_path]);

  const { data, error } = await supabase
    .from('question_bank_items')
    .delete()
    .eq('id', existing.id)
    .select('id')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

/**
 * Upload buffer to Supabase Storage; returns public URL + storage path.
 */
const uploadMedia = async ({ buffer, mimetype, originalname, userId }) => {
  const bucket = BUCKET();
  const path = `${userId}/${Date.now()}_${sanitizeFilename(originalname)}`;

  const { error: upErr } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: mimetype,
    upsert: false,
  });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  return {
    url: pub.publicUrl,
    storage_path: path,
    bucket,
  };
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  uploadMedia,
  BUCKET,
};

const { supabase } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['name', 'code', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';

  // Count query
  let countQuery = supabase.from('subjects').select('id', { count: 'exact', head: true });
  if (search) {
    countQuery = countQuery.or(`name.ilike.%${search}%,code.ilike.%${search}%,description.ilike.%${search}%`);
  }
  if (queryParams.is_active !== undefined) {
    countQuery = countQuery.eq('is_active', queryParams.is_active === 'true');
  }
  const { count: total, error: countError } = await countQuery;
  if (countError) throw countError;

  // Data query
  let dataQuery = supabase
    .from('subjects')
    .select('*');

  if (search) {
    dataQuery = dataQuery.or(`name.ilike.%${search}%,code.ilike.%${search}%,description.ilike.%${search}%`);
  }
  if (queryParams.is_active !== undefined) {
    dataQuery = dataQuery.eq('is_active', queryParams.is_active === 'true');
  }

  dataQuery = dataQuery
    .order(sort, { ascending: sortOrder === 'ASC' })
    .range(offset, offset + limit - 1);

  const { data, error } = await dataQuery;
  if (error) throw error;

  return {
    data: data || [],
    pagination: buildPaginationResponse(total || 0, page, limit),
  };
};

const getById = async (id) => {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

const create = async (data) => {
  const { code, name, description, is_active } = data;
  const { data: row, error } = await supabase
    .from('subjects')
    .insert({
      code,
      name,
      description,
      is_active: is_active !== undefined ? is_active : true,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
};

const update = async (id, data) => {
  const { code, name, description, is_active } = data;

  const updateObj = {};
  if (code !== undefined) updateObj.code = code;
  if (name !== undefined) updateObj.name = name;
  if (description !== undefined) updateObj.description = description;
  if (is_active !== undefined) updateObj.is_active = is_active;
  updateObj.updated_at = new Date().toISOString();

  const { data: row, error } = await supabase
    .from('subjects')
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
    .from('subjects')
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

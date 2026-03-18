const { supabase } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

// Rooms are facilities with type = 'classroom' (or 'lab').
// This service proxies to the facilities table for backward compatibility.

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['name', 'capacity', 'status', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const statusFilter = queryParams.status || null;
  const parentId = queryParams.facility_id || queryParams.parent_id || null;

  // Count query — filter to classroom/lab types
  let countQuery = supabase.from('facilities').select('id', { count: 'exact', head: true })
    .in('type', ['classroom', 'lab']);
  if (search) {
    countQuery = countQuery.or(`name.ilike.%${search}%,equipment.ilike.%${search}%`);
  }
  if (parentId) {
    countQuery = countQuery.eq('parent_id', parentId);
  }
  if (statusFilter) {
    countQuery = countQuery.eq('status', statusFilter);
  }
  const { count: total, error: countError } = await countQuery;
  if (countError) throw countError;

  // Data query
  let dataQuery = supabase
    .from('facilities')
    .select('*')
    .in('type', ['classroom', 'lab']);

  if (search) {
    dataQuery = dataQuery.or(`name.ilike.%${search}%,equipment.ilike.%${search}%`);
  }
  if (parentId) {
    dataQuery = dataQuery.eq('parent_id', parentId);
  }
  if (statusFilter) {
    dataQuery = dataQuery.eq('status', statusFilter);
  }

  dataQuery = dataQuery
    .order(sort, { ascending: sortOrder === 'ASC' })
    .range(offset, offset + limit - 1);

  const { data, error } = await dataQuery;
  if (error) throw error;

  // Get parent facility names
  const parentIds = [...new Set((data || []).filter(r => r.parent_id).map(r => r.parent_id))];
  let parentMap = {};
  if (parentIds.length > 0) {
    const { data: parents, error: pError } = await supabase
      .from('facilities')
      .select('id, name')
      .in('id', parentIds);
    if (pError) throw pError;
    for (const p of (parents || [])) {
      parentMap[p.id] = p.name;
    }
  }

  const rows = (data || []).map(row => ({
    ...row,
    facility_name: row.parent_id ? (parentMap[row.parent_id] || null) : null,
  }));

  return {
    data: rows,
    pagination: buildPaginationResponse(total || 0, page, limit),
  };
};

const getById = async (id) => {
  const { data, error } = await supabase
    .from('facilities')
    .select('*')
    .eq('id', id)
    .in('type', ['classroom', 'lab'])
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  // Get parent name
  let facility_name = null;
  if (data.parent_id) {
    const { data: parent } = await supabase
      .from('facilities')
      .select('name')
      .eq('id', data.parent_id)
      .single();
    facility_name = parent?.name || null;
  }

  return { ...data, facility_name };
};

const create = async (data) => {
  const { name, capacity, equipment, status, parent_id, type } = data;
  const { data: row, error } = await supabase
    .from('facilities')
    .insert({
      name,
      type: type || 'classroom',
      parent_id,
      capacity,
      equipment,
      status: status || 'available',
    })
    .select()
    .single();

  if (error) throw error;
  return row;
};

const update = async (id, data) => {
  const { name, capacity, equipment, status, parent_id, type } = data;

  const updateObj = {};
  if (name !== undefined) updateObj.name = name;
  if (type !== undefined) updateObj.type = type;
  if (parent_id !== undefined) updateObj.parent_id = parent_id;
  if (capacity !== undefined) updateObj.capacity = capacity;
  if (equipment !== undefined) updateObj.equipment = equipment;
  if (status !== undefined) updateObj.status = status;
  updateObj.updated_at = new Date().toISOString();

  const { data: row, error } = await supabase
    .from('facilities')
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
    .from('facilities')
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

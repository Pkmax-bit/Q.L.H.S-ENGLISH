const { supabase } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['name', 'capacity', 'status', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const facilityId = queryParams.facility_id || null;
  const statusFilter = queryParams.status || null;

  // Count query
  let countQuery = supabase.from('rooms').select('id', { count: 'exact', head: true });
  if (search) {
    countQuery = countQuery.or(`name.ilike.%${search}%,equipment.ilike.%${search}%`);
  }
  if (facilityId) {
    countQuery = countQuery.eq('facility_id', facilityId);
  }
  if (statusFilter) {
    countQuery = countQuery.eq('status', statusFilter);
  }
  const { count: total, error: countError } = await countQuery;
  if (countError) throw countError;

  // Data query
  let dataQuery = supabase
    .from('rooms')
    .select(`
      *,
      facilities(name)
    `);

  if (search) {
    dataQuery = dataQuery.or(`name.ilike.%${search}%,equipment.ilike.%${search}%`);
  }
  if (facilityId) {
    dataQuery = dataQuery.eq('facility_id', facilityId);
  }
  if (statusFilter) {
    dataQuery = dataQuery.eq('status', statusFilter);
  }

  dataQuery = dataQuery
    .order(sort, { ascending: sortOrder === 'ASC' })
    .range(offset, offset + limit - 1);

  const { data, error } = await dataQuery;
  if (error) throw error;

  const rows = (data || []).map(row => {
    const { facilities, ...rest } = row;
    return {
      ...rest,
      facility_name: facilities?.name || null,
    };
  });

  return {
    data: rows,
    pagination: buildPaginationResponse(total || 0, page, limit),
  };
};

const getById = async (id) => {
  const { data, error } = await supabase
    .from('rooms')
    .select(`
      *,
      facilities(name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const { facilities, ...rest } = data;
  return {
    ...rest,
    facility_name: facilities?.name || null,
  };
};

const create = async (data) => {
  const { facility_id, name, capacity, equipment, status } = data;
  const { data: row, error } = await supabase
    .from('rooms')
    .insert({
      facility_id,
      name,
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
  const { facility_id, name, capacity, equipment, status } = data;

  const updateObj = {};
  if (facility_id !== undefined) updateObj.facility_id = facility_id;
  if (name !== undefined) updateObj.name = name;
  if (capacity !== undefined) updateObj.capacity = capacity;
  if (equipment !== undefined) updateObj.equipment = equipment;
  if (status !== undefined) updateObj.status = status;
  updateObj.updated_at = new Date().toISOString();

  const { data: row, error } = await supabase
    .from('rooms')
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
    .from('rooms')
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

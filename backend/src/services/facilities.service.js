const { supabase } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['name', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';

  // Count query
  let countQuery = supabase.from('facilities').select('id', { count: 'exact', head: true });
  if (search) {
    countQuery = countQuery.or(`name.ilike.%${search}%,address.ilike.%${search}%,phone.ilike.%${search}%`);
  }
  if (queryParams.is_active !== undefined) {
    countQuery = countQuery.eq('is_active', queryParams.is_active === 'true');
  }
  const { count: total, error: countError } = await countQuery;
  if (countError) throw countError;

  // Data query
  let dataQuery = supabase
    .from('facilities')
    .select('*');

  if (search) {
    dataQuery = dataQuery.or(`name.ilike.%${search}%,address.ilike.%${search}%,phone.ilike.%${search}%`);
  }
  if (queryParams.is_active !== undefined) {
    dataQuery = dataQuery.eq('is_active', queryParams.is_active === 'true');
  }

  dataQuery = dataQuery
    .order(sort, { ascending: sortOrder === 'ASC' })
    .range(offset, offset + limit - 1);

  const { data, error } = await dataQuery;
  if (error) throw error;

  // Get room counts for these facilities
  const facilityIds = (data || []).map(f => f.id);
  let roomCounts = {};
  if (facilityIds.length > 0) {
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('facility_id')
      .in('facility_id', facilityIds);
    if (roomError) throw roomError;

    for (const row of (roomData || [])) {
      roomCounts[row.facility_id] = (roomCounts[row.facility_id] || 0) + 1;
    }
  }

  const rows = (data || []).map(row => ({
    ...row,
    room_count: roomCounts[row.id] || 0,
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
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  // Get room count
  const { count, error: countError } = await supabase
    .from('rooms')
    .select('id', { count: 'exact', head: true })
    .eq('facility_id', id);
  if (countError) throw countError;

  return { ...data, room_count: count || 0 };
};

const create = async (data) => {
  const { name, address, phone, is_active } = data;
  const { data: row, error } = await supabase
    .from('facilities')
    .insert({
      name,
      address,
      phone,
      is_active: is_active !== undefined ? is_active : true,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
};

const update = async (id, data) => {
  const { name, address, phone, is_active } = data;

  const updateObj = {};
  if (name !== undefined) updateObj.name = name;
  if (address !== undefined) updateObj.address = address;
  if (phone !== undefined) updateObj.phone = phone;
  if (is_active !== undefined) updateObj.is_active = is_active;
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

const { supabase } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['name', 'type', 'capacity', 'status', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const typeFilter = queryParams.type || null;
  const statusFilter = queryParams.status || null;
  const parentId = queryParams.parent_id || null;

  // Count query
  let countQuery = supabase.from('facilities').select('id', { count: 'exact', head: true });
  if (search) {
    countQuery = countQuery.or(`name.ilike.%${search}%,address.ilike.%${search}%,equipment.ilike.%${search}%`);
  }
  if (typeFilter) {
    countQuery = countQuery.eq('type', typeFilter);
  }
  if (statusFilter) {
    countQuery = countQuery.eq('status', statusFilter);
  }
  if (parentId) {
    countQuery = countQuery.eq('parent_id', parentId);
  }
  const { count: total, error: countError } = await countQuery;
  if (countError) throw countError;

  // Data query
  let dataQuery = supabase
    .from('facilities')
    .select('*');

  if (search) {
    dataQuery = dataQuery.or(`name.ilike.%${search}%,address.ilike.%${search}%,equipment.ilike.%${search}%`);
  }
  if (typeFilter) {
    dataQuery = dataQuery.eq('type', typeFilter);
  }
  if (statusFilter) {
    dataQuery = dataQuery.eq('status', statusFilter);
  }
  if (parentId) {
    dataQuery = dataQuery.eq('parent_id', parentId);
  }

  dataQuery = dataQuery
    .order(sort, { ascending: sortOrder === 'ASC' })
    .range(offset, offset + limit - 1);

  const { data, error } = await dataQuery;
  if (error) throw error;

  // Get child counts for these facilities (how many children each has)
  const facilityIds = (data || []).map(f => f.id);
  let childCounts = {};
  if (facilityIds.length > 0) {
    const { data: childData, error: childError } = await supabase
      .from('facilities')
      .select('parent_id')
      .in('parent_id', facilityIds);
    if (childError) throw childError;

    for (const row of (childData || [])) {
      childCounts[row.parent_id] = (childCounts[row.parent_id] || 0) + 1;
    }
  }

  const rows = (data || []).map(row => ({
    ...row,
    child_count: childCounts[row.id] || 0,
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

  // Get child count
  const { count, error: countError } = await supabase
    .from('facilities')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', id);
  if (countError) throw countError;

  return { ...data, child_count: count || 0 };
};

const create = async (data) => {
  const { name, type, parent_id, capacity, equipment, status, address } = data;
  const { data: row, error } = await supabase
    .from('facilities')
    .insert({
      name,
      type: type || 'classroom',
      parent_id,
      capacity,
      equipment,
      status: status || 'available',
      address,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
};

const update = async (id, data) => {
  const { name, type, parent_id, capacity, equipment, status, address } = data;

  const updateObj = {};
  if (name !== undefined) updateObj.name = name;
  if (type !== undefined) updateObj.type = type;
  if (parent_id !== undefined) updateObj.parent_id = parent_id;
  if (capacity !== undefined) updateObj.capacity = capacity;
  if (equipment !== undefined) updateObj.equipment = equipment;
  if (status !== undefined) updateObj.status = status;
  if (address !== undefined) updateObj.address = address;
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
  // Check for child facilities first
  const { count, error: countError } = await supabase
    .from('facilities')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', id);
  if (countError) throw countError;

  if (count > 0) {
    throw {
      statusCode: 400,
      message: `Không thể xóa cơ sở này vì còn ${count} phòng/khu vực con. Hãy xóa các phòng con trước.`,
    };
  }

  // Check for schedules referencing this facility
  const { count: schedCount, error: schedErr } = await supabase
    .from('schedules')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', id);
  if (schedErr) throw schedErr;

  if (schedCount > 0) {
    throw {
      statusCode: 400,
      message: `Không thể xóa vì phòng này đang được dùng trong ${schedCount} thời khóa biểu. Hãy xóa lịch học trước.`,
    };
  }

  const { data, error } = await supabase
    .from('facilities')
    .delete()
    .eq('id', id)
    .select('id')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    if (error.code === '23503') {
      throw { statusCode: 400, message: 'Không thể xóa vì cơ sở đang được tham chiếu ở nơi khác.' };
    }
    throw error;
  }
  return data;
};

module.exports = { getAll, getById, create, update, remove };

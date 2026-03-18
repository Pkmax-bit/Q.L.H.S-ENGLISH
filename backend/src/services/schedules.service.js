const { supabase } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['day_of_week', 'start_time', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const classId = queryParams.class_id || null;
  const roomId = queryParams.room_id || null;

  // Count query
  let countQuery = supabase.from('schedules').select('id', { count: 'exact', head: true });
  if (classId) {
    countQuery = countQuery.eq('class_id', classId);
  }
  if (roomId) {
    countQuery = countQuery.eq('room_id', roomId);
  }
  if (queryParams.is_active !== undefined) {
    countQuery = countQuery.eq('is_active', queryParams.is_active === 'true');
  }
  const { count: total, error: countError } = await countQuery;
  if (countError) throw countError;

  // Data query
  let dataQuery = supabase
    .from('schedules')
    .select(`
      *,
      classes(name),
      facilities(name)
    `);

  if (classId) {
    dataQuery = dataQuery.eq('class_id', classId);
  }
  if (roomId) {
    dataQuery = dataQuery.eq('room_id', roomId);
  }
  if (queryParams.is_active !== undefined) {
    dataQuery = dataQuery.eq('is_active', queryParams.is_active === 'true');
  }

  dataQuery = dataQuery
    .order(sort, { ascending: sortOrder === 'ASC' })
    .range(offset, offset + limit - 1);

  const { data, error } = await dataQuery;
  if (error) throw error;

  const rows = (data || []).map(row => {
    const { classes, facilities, ...rest } = row;
    return {
      ...rest,
      class_name: classes?.name || null,
      room_name: facilities?.name || null,
    };
  });

  return {
    data: rows,
    pagination: buildPaginationResponse(total || 0, page, limit),
  };
};

const getById = async (id) => {
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      *,
      classes(name),
      facilities(name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const { classes, facilities, ...rest } = data;
  return {
    ...rest,
    class_name: classes?.name || null,
    room_name: facilities?.name || null,
  };
};

const create = async (data) => {
  const { class_id, day_of_week, start_time, end_time, room_id, is_active } = data;

  // Check for conflicts
  const conflicts = await checkScheduleConflict(room_id, class_id, day_of_week, start_time, end_time);
  if (conflicts.length > 0) {
    throw { statusCode: 409, message: 'Schedule conflict detected', data: { conflicts } };
  }

  const { data: row, error } = await supabase
    .from('schedules')
    .insert({
      class_id,
      day_of_week,
      start_time,
      end_time,
      room_id,
      is_active: is_active !== undefined ? is_active : true,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
};

const update = async (id, data) => {
  const { class_id, day_of_week, start_time, end_time, room_id, is_active } = data;

  // If time/room related fields changed, check for conflicts
  if (room_id !== undefined || day_of_week !== undefined || start_time !== undefined || end_time !== undefined) {
    const { data: current, error: currentError } = await supabase
      .from('schedules')
      .select('*')
      .eq('id', id)
      .single();

    if (currentError || !current) {
      throw { statusCode: 404, message: 'Schedule not found' };
    }

    const conflicts = await checkScheduleConflict(
      room_id !== undefined ? room_id : current.room_id,
      class_id !== undefined ? class_id : current.class_id,
      day_of_week !== undefined ? day_of_week : current.day_of_week,
      start_time !== undefined ? start_time : current.start_time,
      end_time !== undefined ? end_time : current.end_time,
      id
    );

    if (conflicts.length > 0) {
      throw { statusCode: 409, message: 'Schedule conflict detected', data: { conflicts } };
    }
  }

  const updateObj = {};
  if (class_id !== undefined) updateObj.class_id = class_id;
  if (day_of_week !== undefined) updateObj.day_of_week = day_of_week;
  if (start_time !== undefined) updateObj.start_time = start_time;
  if (end_time !== undefined) updateObj.end_time = end_time;
  if (room_id !== undefined) updateObj.room_id = room_id;
  if (is_active !== undefined) updateObj.is_active = is_active;
  updateObj.updated_at = new Date().toISOString();

  const { data: row, error } = await supabase
    .from('schedules')
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
    .from('schedules')
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

/**
 * Check for room conflicts on the schedules table.
 * Each schedule row IS a slot (day_of_week, start_time, end_time, room_id).
 */
const checkScheduleConflict = async (roomId, classId, dayOfWeek, startTime, endTime, excludeId = null) => {
  const conflicts = [];

  if (roomId) {
    let query = supabase
      .from('schedules')
      .select('*, facilities(name)')
      .eq('room_id', roomId)
      .eq('day_of_week', dayOfWeek)
      .lt('start_time', endTime)
      .gt('end_time', startTime)
      .eq('is_active', true);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data: roomConflicts, error } = await query;
    if (error) throw error;

    if (roomConflicts && roomConflicts.length > 0) {
      conflicts.push({
        type: 'room',
        message: `Room "${roomConflicts[0].facilities?.name || 'Unknown'}" is already booked at this time`,
        conflictingSchedules: roomConflicts,
      });
    }
  }

  return conflicts;
};

module.exports = { getAll, getById, create, update, remove };

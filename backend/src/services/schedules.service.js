const { supabase } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');
const { checkScheduleConflict } = require('../utils/scheduleValidator');

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['name', 'start_date', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const classId = queryParams.class_id || null;

  // Count query - need to handle search across joined table
  // For search on class name, we need inner join approach
  let countQuery = supabase.from('schedules').select('id, classes!inner(name)', { count: 'exact', head: true });
  if (search) {
    countQuery = countQuery.or(`name.ilike.%${search}%,classes.name.ilike.%${search}%`);
  }
  if (classId) {
    countQuery = countQuery.eq('class_id', classId);
  }
  if (queryParams.is_active !== undefined) {
    countQuery = countQuery.eq('is_active', queryParams.is_active === 'true');
  }
  const { count: total, error: countError } = await countQuery;
  if (countError) {
    // Fallback: count without cross-table search
    let fallbackCount = supabase.from('schedules').select('id', { count: 'exact', head: true });
    if (search) {
      fallbackCount = fallbackCount.ilike('name', `%${search}%`);
    }
    if (classId) {
      fallbackCount = fallbackCount.eq('class_id', classId);
    }
    if (queryParams.is_active !== undefined) {
      fallbackCount = fallbackCount.eq('is_active', queryParams.is_active === 'true');
    }
    const { count: fallbackTotal, error: fbError } = await fallbackCount;
    if (fbError) throw fbError;
    var totalCount = fallbackTotal || 0;
  } else {
    var totalCount = total || 0;
  }

  // Data query
  let dataQuery = supabase
    .from('schedules')
    .select(`
      *,
      classes(name)
    `);

  if (search) {
    dataQuery = dataQuery.ilike('name', `%${search}%`);
  }
  if (classId) {
    dataQuery = dataQuery.eq('class_id', classId);
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
    const { classes, ...rest } = row;
    return {
      ...rest,
      class_name: classes?.name || null,
    };
  });

  return {
    data: rows,
    pagination: buildPaginationResponse(totalCount, page, limit),
  };
};

const getById = async (id) => {
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      *,
      classes(name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const { classes, ...rest } = data;
  const schedule = {
    ...rest,
    class_name: classes?.name || null,
  };

  // Get slots with joins
  const { data: slots, error: slotsError } = await supabase
    .from('schedule_slots')
    .select(`
      *,
      teachers(full_name),
      rooms(name),
      subjects(name)
    `)
    .eq('schedule_id', id)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (slotsError) throw slotsError;

  schedule.slots = (slots || []).map(slot => {
    const { teachers, rooms, subjects, ...slotRest } = slot;
    return {
      ...slotRest,
      teacher_name: teachers?.full_name || null,
      room_name: rooms?.name || null,
      subject_name: subjects?.name || null,
    };
  });

  return schedule;
};

const create = async (data) => {
  const { class_id, name, start_date, end_date, is_active } = data;
  const { data: row, error } = await supabase
    .from('schedules')
    .insert({
      class_id,
      name,
      start_date,
      end_date,
      is_active: is_active !== undefined ? is_active : true,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
};

const update = async (id, data) => {
  const { name, start_date, end_date, is_active } = data;

  const updateObj = {};
  if (name !== undefined) updateObj.name = name;
  if (start_date !== undefined) updateObj.start_date = start_date;
  if (end_date !== undefined) updateObj.end_date = end_date;
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

const addSlot = async (scheduleId, data) => {
  const { teacher_id, room_id, subject_id, day_of_week, start_time, end_time, recurrence, specific_date } = data;

  const conflicts = await checkScheduleConflict(
    room_id, teacher_id, day_of_week, start_time, end_time, specific_date
  );

  if (conflicts.length > 0) {
    throw { statusCode: 409, message: 'Schedule conflict detected', data: { conflicts } };
  }

  const { data: row, error } = await supabase
    .from('schedule_slots')
    .insert({
      schedule_id: scheduleId,
      teacher_id,
      room_id,
      subject_id,
      day_of_week,
      start_time,
      end_time,
      recurrence: recurrence || 'weekly',
      specific_date,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
};

const updateSlot = async (slotId, data) => {
  const { teacher_id, room_id, subject_id, day_of_week, start_time, end_time, recurrence, specific_date } = data;

  if (room_id || teacher_id || day_of_week !== undefined || start_time || end_time) {
    // Get current slot data
    const { data: currentSlot, error: slotError } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('id', slotId)
      .single();

    if (slotError || !currentSlot) {
      throw { statusCode: 404, message: 'Slot not found' };
    }

    const conflicts = await checkScheduleConflict(
      room_id || currentSlot.room_id,
      teacher_id || currentSlot.teacher_id,
      day_of_week !== undefined ? day_of_week : currentSlot.day_of_week,
      start_time || currentSlot.start_time,
      end_time || currentSlot.end_time,
      specific_date || currentSlot.specific_date,
      slotId
    );

    if (conflicts.length > 0) {
      throw { statusCode: 409, message: 'Schedule conflict detected', data: { conflicts } };
    }
  }

  const updateObj = {};
  if (teacher_id !== undefined) updateObj.teacher_id = teacher_id;
  if (room_id !== undefined) updateObj.room_id = room_id;
  if (subject_id !== undefined) updateObj.subject_id = subject_id;
  if (day_of_week !== undefined) updateObj.day_of_week = day_of_week;
  if (start_time !== undefined) updateObj.start_time = start_time;
  if (end_time !== undefined) updateObj.end_time = end_time;
  if (recurrence !== undefined) updateObj.recurrence = recurrence;
  if (specific_date !== undefined) updateObj.specific_date = specific_date;

  const { data: row, error } = await supabase
    .from('schedule_slots')
    .update(updateObj)
    .eq('id', slotId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return row;
};

const removeSlot = async (slotId) => {
  const { data, error } = await supabase
    .from('schedule_slots')
    .delete()
    .eq('id', slotId)
    .select('id')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

module.exports = { getAll, getById, create, update, remove, addSlot, updateSlot, removeSlot };

const { supabase } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');

async function enrichScheduleRows(rows) {
  if (!rows?.length) return [];

  const classIds = [...new Set(rows.map((r) => r.class_id).filter(Boolean))];
  const roomIds = [...new Set(rows.map((r) => r.room_id).filter(Boolean))];

  const classMap = new Map();
  const roomMap = new Map();
  const teacherMap = new Map();

  if (classIds.length) {
    const { data: classes, error } = await supabase
      .from('classes')
      .select('id, name, start_date, end_date, teacher_id, subject_id')
      .in('id', classIds);
    if (error) throw error;
    for (const c of classes || []) classMap.set(String(c.id), c);

    const teacherIds = [...new Set((classes || []).map((c) => c.teacher_id).filter(Boolean))];
    if (teacherIds.length) {
      const { data: teachers, error: tErr } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', teacherIds);
      if (tErr) throw tErr;
      for (const t of teachers || []) teacherMap.set(String(t.id), t.full_name);
    }

    const subjectIds = [...new Set((classes || []).map((c) => c.subject_id).filter(Boolean))];
    const subjectMap = new Map();
    if (subjectIds.length) {
      const { data: subjects, error: sErr } = await supabase
        .from('subjects')
        .select('id, name, code')
        .in('id', subjectIds);
      if (sErr) throw sErr;
      for (const s of subjects || []) subjectMap.set(String(s.id), s);
    }

    for (const [id, cls] of classMap) {
      const sub = cls.subject_id ? subjectMap.get(String(cls.subject_id)) : null;
      classMap.set(id, {
        ...cls,
        subject_name: sub?.name || null,
        subject_code: sub?.code || null,
      });
    }
  }

  if (roomIds.length) {
    const { data: rooms, error } = await supabase
      .from('facilities')
      .select('id, name, parent_id')
      .in('id', roomIds);
    if (error) throw error;
    for (const r of rooms || []) roomMap.set(String(r.id), r);
  }

  return rows.map((row) => {
    const cls = classMap.get(String(row.class_id));
    const room = roomMap.get(String(row.room_id));
    return {
      ...row,
      class_name: cls?.name || null,
      class_start_date: cls?.start_date || null,
      class_end_date: cls?.end_date || null,
      subject_id: cls?.subject_id || null,
      subject_name: cls?.subject_name || null,
      subject_code: cls?.subject_code || null,
      teacher_name: cls?.teacher_id ? teacherMap.get(String(cls.teacher_id)) || null : null,
      room_name: room?.name || null,
    };
  });
}

const getAll = async (queryParams, currentUser = null) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['day_of_week', 'start_time', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const classId = queryParams.class_id || null;
  const roomId = queryParams.room_id || null;

  // Role-based: get relevant class IDs for teacher/student
  let roleClassIds = null;
  if (currentUser && currentUser.role === 'teacher') {
    const { data: teacherClasses, error: tcError } = await supabase
      .from('classes')
      .select('id')
      .eq('teacher_id', currentUser.id);
    if (tcError) throw tcError;
    roleClassIds = (teacherClasses || []).map(c => c.id);
    if (roleClassIds.length === 0) {
      return { data: [], pagination: buildPaginationResponse(0, page, limit) };
    }
  } else if (currentUser && currentUser.role === 'student') {
    const { data: enrollments, error: enError } = await supabase
      .from('class_students')
      .select('class_id')
      .eq('student_id', currentUser.id);
    if (enError) throw enError;
    roleClassIds = (enrollments || []).map(e => e.class_id);
    if (roleClassIds.length === 0) {
      return { data: [], pagination: buildPaginationResponse(0, page, limit) };
    }
  }

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
  if (roleClassIds) {
    countQuery = countQuery.in('class_id', roleClassIds);
  }
  const { count: total, error: countError } = await countQuery;
  if (countError) throw countError;

  // Data query — không embed join (Supabase có thể thiếu FK schedules→classes)
  let dataQuery = supabase.from('schedules').select('*');

  if (classId) {
    dataQuery = dataQuery.eq('class_id', classId);
  }
  if (roomId) {
    dataQuery = dataQuery.eq('room_id', roomId);
  }
  if (queryParams.is_active !== undefined) {
    dataQuery = dataQuery.eq('is_active', queryParams.is_active === 'true');
  }
  if (roleClassIds) {
    dataQuery = dataQuery.in('class_id', roleClassIds);
  }

  dataQuery = dataQuery
    .order(sort, { ascending: sortOrder === 'ASC' })
    .range(offset, offset + limit - 1);

  const { data, error } = await dataQuery;
  if (error) throw error;

  const rows = await enrichScheduleRows(data || []);

  return {
    data: rows,
    pagination: buildPaginationResponse(total || 0, page, limit),
  };
};

const getById = async (id) => {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const [row] = await enrichScheduleRows([data]);
  return row || null;
};

const create = async (data) => {
  const { class_id, day_of_week, start_time, end_time, room_id, is_active, start_date, end_date } = data;

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
      start_date: start_date || null,
      end_date: end_date || null,
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
  if (data.start_date !== undefined) updateObj.start_date = data.start_date;
  if (data.end_date !== undefined) updateObj.end_date = data.end_date;
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
 * Check for schedule conflicts: room + teacher.
 * 
 * Rules:
 * 1. ROOM conflict: same room + same day + overlapping time
 * 2. TEACHER conflict: same teacher (via class.teacher_id) + same day + overlapping time
 *    → one teacher cannot teach two classes at the same time on the same day
 * 3. OK: different teacher + different room + same time + same day → allowed
 */
const checkScheduleConflict = async (roomId, classId, dayOfWeek, startTime, endTime, excludeId = null) => {
  const conflicts = [];
  const dayNames = { 0: 'CN', 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7' };

  // 1. Room conflict
  if (roomId) {
    let query = supabase
      .from('schedules')
      .select('*')
      .eq('room_id', roomId)
      .eq('day_of_week', dayOfWeek)
      .lt('start_time', endTime)
      .gt('end_time', startTime)
      .eq('is_active', true);

    if (excludeId) query = query.neq('id', excludeId);

    const { data: roomConflicts, error } = await query;
    if (error) throw error;

    const enriched = await enrichScheduleRows(roomConflicts || []);

    if (enriched.length > 0) {
      for (const rc of enriched) {
        conflicts.push({
          type: 'room',
          message: `Phòng "${rc.room_name || '?'}" đã có lớp "${rc.class_name || '?'}" vào ${dayNames[dayOfWeek]} ${rc.start_time?.substring(0, 5)}-${rc.end_time?.substring(0, 5)}`,
          schedule: rc,
        });
      }
    }
  }

  // 2. Teacher conflict — get teacher_id of the class being scheduled
  if (classId) {
    const { data: targetClass } = await supabase
      .from('classes')
      .select('teacher_id, name')
      .eq('id', classId)
      .single();

    if (targetClass?.teacher_id) {
      // Find all other classes taught by same teacher
      const { data: teacherClasses } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', targetClass.teacher_id)
        .neq('id', classId);

      if (teacherClasses && teacherClasses.length > 0) {
        const otherClassIds = teacherClasses.map(c => c.id);
        const classNameMap = {};
        teacherClasses.forEach(c => { classNameMap[c.id] = c.name; });

        let query = supabase
          .from('schedules')
          .select('*')
          .in('class_id', otherClassIds)
          .eq('day_of_week', dayOfWeek)
          .lt('start_time', endTime)
          .gt('end_time', startTime)
          .eq('is_active', true);

        if (excludeId) query = query.neq('id', excludeId);

        const { data: teacherConflicts, error: tErr } = await query;
        if (tErr) throw tErr;

        if (teacherConflicts && teacherConflicts.length > 0) {
          // Get teacher name
          const { data: teacherProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', targetClass.teacher_id)
            .single();

          const teacherName = teacherProfile?.full_name || 'Giáo viên';

          for (const tc of teacherConflicts) {
            conflicts.push({
              type: 'teacher',
              message: `${teacherName} đã có lịch dạy "${classNameMap[tc.class_id] || '?'}" vào ${dayNames[dayOfWeek]} ${tc.start_time?.substring(0,5)}-${tc.end_time?.substring(0,5)}`,
              schedule: tc,
            });
          }
        }
      }
    }
  }

  return conflicts;
};

/**
 * Get existing schedules for a specific day + time range.
 * Used by frontend to show "what's already scheduled" when creating.
 */
const getConflictPreview = async (dayOfWeek, startTime, endTime) => {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('day_of_week', dayOfWeek)
    .lt('start_time', endTime)
    .gt('end_time', startTime)
    .eq('is_active', true)
    .order('start_time', { ascending: true });

  if (error) throw error;

  const enriched = await enrichScheduleRows(data || []);

  const classIds = [...new Set(enriched.map((s) => s.class_id).filter(Boolean))];
  let teacherIdByClass = {};
  if (classIds.length) {
    const { data: classes } = await supabase.from('classes').select('id, teacher_id').in('id', classIds);
    for (const c of classes || []) teacherIdByClass[c.id] = c.teacher_id;
  }

  return enriched.map((s) => ({
    id: s.id,
    class_id: s.class_id,
    class_name: s.class_name,
    teacher_id: teacherIdByClass[s.class_id] || null,
    teacher_name: s.teacher_name,
    day_of_week: s.day_of_week,
    start_time: s.start_time,
    end_time: s.end_time,
    room_id: s.room_id,
    room_name: s.room_name,
    facility_parent_id: null,
  }));
};

/**
 * Bulk create schedules — repeat weekly within a date range.
 * Input: { class_id, room_id, days_of_week: [1,3,5], start_time, end_time, start_date, sessions_count }
 * Creates one schedule row per day_of_week with start_date and end_date.
 * end_date is calculated by generating all session dates and taking the last one.
 */
const bulkCreate = async (data) => {
  const { class_id, room_id, days_of_week, start_time, end_time, start_date, end_date, sessions_count } = data;

  if (!days_of_week || !Array.isArray(days_of_week) || days_of_week.length === 0) {
    throw { statusCode: 400, message: 'Phải chọn ít nhất 1 ngày trong tuần' };
  }

  // Calculate end_date from sessions_count if provided
  let calculatedEndDate = end_date || null;
  if (start_date && sessions_count && !end_date) {
    const count = Number(sessions_count);
    const jsDays = new Set(days_of_week);
    const dates = [];
    const current = new Date(start_date + 'T12:00:00');
    for (let i = 0; i < 365 && dates.length < count; i++) {
      if (jsDays.has(current.getDay())) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    if (dates.length > 0) {
      const lastDate = dates[dates.length - 1];
      calculatedEndDate = lastDate.toISOString().split('T')[0];
    }
  }

  const rows = [];
  for (const day of days_of_week) {
    // Check conflicts for each day
    const conflicts = await checkScheduleConflict(room_id, class_id, day, start_time, end_time);
    if (conflicts.length > 0) {
      const dayNames = { 0: 'CN', 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7' };
      throw {
        statusCode: 409,
        message: `Trùng lịch vào ${dayNames[day] || day}: ${conflicts[0].message}`,
        data: { conflicts },
      };
    }

    rows.push({
      class_id,
      day_of_week: day,
      start_time,
      end_time,
      room_id: room_id || null,
      is_active: true,
      start_date: start_date || null,
      end_date: calculatedEndDate,
    });
  }

  const { data: inserted, error } = await supabase.from('schedules').insert(rows).select();
  if (error) throw error;

  return {
    created: inserted.length,
    schedules: inserted,
    start_date: start_date || null,
    end_date: calculatedEndDate,
    sessions_count: sessions_count || null,
  };
};

module.exports = { getAll, getById, create, update, remove, bulkCreate, getConflictPreview, enrichScheduleRows };

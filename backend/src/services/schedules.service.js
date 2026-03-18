const { query } = require('../config/database');
const { parsePagination, buildPaginationResponse } = require('../utils/pagination');
const { checkScheduleConflict } = require('../utils/scheduleValidator');

const getAll = async (queryParams) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(queryParams);
  const allowedSort = ['name', 'start_date', 'created_at'];
  const sort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const classId = queryParams.class_id || null;

  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramIdx = 1;

  if (search) {
    whereClause += ` AND (s.name ILIKE $${paramIdx} OR c.name ILIKE $${paramIdx})`;
    params.push(`%${search}%`);
    paramIdx++;
  }

  if (classId) {
    whereClause += ` AND s.class_id = $${paramIdx}`;
    params.push(classId);
    paramIdx++;
  }

  if (queryParams.is_active !== undefined) {
    whereClause += ` AND s.is_active = $${paramIdx}`;
    params.push(queryParams.is_active === 'true');
    paramIdx++;
  }

  const countResult = await query(`SELECT COUNT(*) FROM schedules s JOIN classes c ON s.class_id = c.id ${whereClause}`, params);
  const total = parseInt(countResult.rows[0].count);

  const dataResult = await query(
    `SELECT s.*, c.name as class_name
     FROM schedules s
     JOIN classes c ON s.class_id = c.id
     ${whereClause}
     ORDER BY s.${sort} ${sortOrder}
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset]
  );

  return {
    data: dataResult.rows,
    pagination: buildPaginationResponse(total, page, limit),
  };
};

const getById = async (id) => {
  const result = await query(
    `SELECT s.*, c.name as class_name
     FROM schedules s
     JOIN classes c ON s.class_id = c.id
     WHERE s.id = $1`,
    [id]
  );

  if (result.rows.length === 0) return null;

  const schedule = result.rows[0];

  const slots = await query(
    `SELECT ss.*, t.full_name as teacher_name, r.name as room_name, sub.name as subject_name
     FROM schedule_slots ss
     LEFT JOIN teachers t ON ss.teacher_id = t.id
     LEFT JOIN rooms r ON ss.room_id = r.id
     LEFT JOIN subjects sub ON ss.subject_id = sub.id
     WHERE ss.schedule_id = $1
     ORDER BY ss.day_of_week, ss.start_time`,
    [id]
  );
  schedule.slots = slots.rows;

  return schedule;
};

const create = async (data) => {
  const { class_id, name, start_date, end_date, is_active } = data;
  const result = await query(
    `INSERT INTO schedules (class_id, name, start_date, end_date, is_active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [class_id, name, start_date, end_date, is_active !== undefined ? is_active : true]
  );
  return result.rows[0];
};

const update = async (id, data) => {
  const { name, start_date, end_date, is_active } = data;
  const result = await query(
    `UPDATE schedules SET
       name = COALESCE($1, name),
       start_date = COALESCE($2, start_date),
       end_date = COALESCE($3, end_date),
       is_active = COALESCE($4, is_active),
       updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [name, start_date, end_date, is_active, id]
  );
  return result.rows[0] || null;
};

const remove = async (id) => {
  const result = await query('DELETE FROM schedules WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
};

const addSlot = async (scheduleId, data) => {
  const { teacher_id, room_id, subject_id, day_of_week, start_time, end_time, recurrence, specific_date } = data;

  const conflicts = await checkScheduleConflict(
    room_id, teacher_id, day_of_week, start_time, end_time, specific_date
  );

  if (conflicts.length > 0) {
    throw { statusCode: 409, message: 'Schedule conflict detected', data: { conflicts } };
  }

  const result = await query(
    `INSERT INTO schedule_slots (schedule_id, teacher_id, room_id, subject_id, day_of_week, start_time, end_time, recurrence, specific_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [scheduleId, teacher_id, room_id, subject_id, day_of_week, start_time, end_time, recurrence || 'weekly', specific_date]
  );
  return result.rows[0];
};

const updateSlot = async (slotId, data) => {
  const { teacher_id, room_id, subject_id, day_of_week, start_time, end_time, recurrence, specific_date } = data;

  if (room_id || teacher_id || day_of_week !== undefined || start_time || end_time) {
    const currentSlot = await query('SELECT * FROM schedule_slots WHERE id = $1', [slotId]);
    if (currentSlot.rows.length === 0) throw { statusCode: 404, message: 'Slot not found' };
    const current = currentSlot.rows[0];

    const conflicts = await checkScheduleConflict(
      room_id || current.room_id,
      teacher_id || current.teacher_id,
      day_of_week !== undefined ? day_of_week : current.day_of_week,
      start_time || current.start_time,
      end_time || current.end_time,
      specific_date || current.specific_date,
      slotId
    );

    if (conflicts.length > 0) {
      throw { statusCode: 409, message: 'Schedule conflict detected', data: { conflicts } };
    }
  }

  const result = await query(
    `UPDATE schedule_slots SET
       teacher_id = COALESCE($1, teacher_id),
       room_id = COALESCE($2, room_id),
       subject_id = COALESCE($3, subject_id),
       day_of_week = COALESCE($4, day_of_week),
       start_time = COALESCE($5, start_time),
       end_time = COALESCE($6, end_time),
       recurrence = COALESCE($7, recurrence),
       specific_date = COALESCE($8, specific_date)
     WHERE id = $9
     RETURNING *`,
    [teacher_id, room_id, subject_id, day_of_week, start_time, end_time, recurrence, specific_date, slotId]
  );
  return result.rows[0] || null;
};

const removeSlot = async (slotId) => {
  const result = await query('DELETE FROM schedule_slots WHERE id = $1 RETURNING id', [slotId]);
  return result.rows[0] || null;
};

module.exports = { getAll, getById, create, update, remove, addSlot, updateSlot, removeSlot };

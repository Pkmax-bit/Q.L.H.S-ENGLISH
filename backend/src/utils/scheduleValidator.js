const { query } = require('../config/database');

const checkScheduleConflict = async (roomId, teacherId, dayOfWeek, startTime, endTime, specificDate, excludeSlotId = null) => {
  const conflicts = [];

  if (roomId) {
    let sql = `
      SELECT ss.*, s.name as schedule_name, r.name as room_name
      FROM schedule_slots ss
      JOIN schedules s ON ss.schedule_id = s.id
      JOIN rooms r ON ss.room_id = r.id
      WHERE ss.room_id = $1
        AND ss.day_of_week = $2
        AND ss.start_time < $3
        AND ss.end_time > $4
        AND s.is_active = true
    `;
    const params = [roomId, dayOfWeek, endTime, startTime];
    let paramIdx = 5;

    if (excludeSlotId) {
      sql += ` AND ss.id != $${paramIdx}`;
      params.push(excludeSlotId);
      paramIdx++;
    }

    if (specificDate) {
      sql += ` AND (ss.specific_date = $${paramIdx} OR (ss.recurrence = 'weekly' AND ss.specific_date IS NULL))`;
      params.push(specificDate);
    } else {
      sql += ` AND (ss.recurrence = 'weekly' OR ss.specific_date IS NOT NULL)`;
    }

    const result = await query(sql, params);
    if (result.rows.length > 0) {
      conflicts.push({
        type: 'room',
        message: `Room "${result.rows[0].room_name}" is already booked at this time`,
        conflictingSlots: result.rows,
      });
    }
  }

  if (teacherId) {
    let sql = `
      SELECT ss.*, s.name as schedule_name, t.full_name as teacher_name
      FROM schedule_slots ss
      JOIN schedules s ON ss.schedule_id = s.id
      JOIN teachers t ON ss.teacher_id = t.id
      WHERE ss.teacher_id = $1
        AND ss.day_of_week = $2
        AND ss.start_time < $3
        AND ss.end_time > $4
        AND s.is_active = true
    `;
    const params = [teacherId, dayOfWeek, endTime, startTime];
    let paramIdx = 5;

    if (excludeSlotId) {
      sql += ` AND ss.id != $${paramIdx}`;
      params.push(excludeSlotId);
      paramIdx++;
    }

    if (specificDate) {
      sql += ` AND (ss.specific_date = $${paramIdx} OR (ss.recurrence = 'weekly' AND ss.specific_date IS NULL))`;
      params.push(specificDate);
    } else {
      sql += ` AND (ss.recurrence = 'weekly' OR ss.specific_date IS NOT NULL)`;
    }

    const result = await query(sql, params);
    if (result.rows.length > 0) {
      conflicts.push({
        type: 'teacher',
        message: `Teacher "${result.rows[0].teacher_name}" already has a class at this time`,
        conflictingSlots: result.rows,
      });
    }
  }

  return conflicts;
};

module.exports = { checkScheduleConflict };

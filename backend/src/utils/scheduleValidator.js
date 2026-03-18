const { supabase } = require('../config/database');

/**
 * Check for schedule conflicts on the schedules table.
 * In the new schema, each schedule row IS a slot (day_of_week, start_time, end_time, room_id).
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

module.exports = { checkScheduleConflict };

const { supabase } = require('../config/database');

const checkScheduleConflict = async (roomId, teacherId, dayOfWeek, startTime, endTime, specificDate, excludeSlotId = null) => {
  const conflicts = [];

  if (roomId) {
    let query = supabase
      .from('schedule_slots')
      .select(`
        *,
        schedules!inner(name, is_active),
        rooms!inner(name)
      `)
      .eq('room_id', roomId)
      .eq('day_of_week', dayOfWeek)
      .lt('start_time', endTime)
      .gt('end_time', startTime)
      .eq('schedules.is_active', true);

    if (excludeSlotId) {
      query = query.neq('id', excludeSlotId);
    }

    const { data: roomConflicts, error } = await query;
    if (error) throw error;

    if (roomConflicts && roomConflicts.length > 0) {
      conflicts.push({
        type: 'room',
        message: `Room "${roomConflicts[0].rooms.name}" is already booked at this time`,
        conflictingSlots: roomConflicts,
      });
    }
  }

  if (teacherId) {
    let query = supabase
      .from('schedule_slots')
      .select(`
        *,
        schedules!inner(name, is_active),
        teachers!inner(full_name)
      `)
      .eq('teacher_id', teacherId)
      .eq('day_of_week', dayOfWeek)
      .lt('start_time', endTime)
      .gt('end_time', startTime)
      .eq('schedules.is_active', true);

    if (excludeSlotId) {
      query = query.neq('id', excludeSlotId);
    }

    const { data: teacherConflicts, error } = await query;
    if (error) throw error;

    if (teacherConflicts && teacherConflicts.length > 0) {
      conflicts.push({
        type: 'teacher',
        message: `Teacher "${teacherConflicts[0].teachers.full_name}" already has a class at this time`,
        conflictingSlots: teacherConflicts,
      });
    }
  }

  return conflicts;
};

module.exports = { checkScheduleConflict };

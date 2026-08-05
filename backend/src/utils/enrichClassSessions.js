const { supabase } = require('../config/database');
const { loadProfilesByIds } = require('./enrichClassRows');

const DAY_LABELS = { 0: 'CN', 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7' };

function parseLocalDate(dateStr) {
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

async function enrichSessionRows(rows, options = {}) {
  const { includePayFields = false } = options;
  if (!rows?.length) return [];

  const classIds = [...new Set(rows.map((r) => r.class_id).filter(Boolean))];
  const lessonIds = [...new Set(rows.map((r) => r.lesson_id).filter(Boolean))];
  const scheduleIds = [...new Set(rows.map((r) => r.schedule_id).filter(Boolean))];

  const classMap = new Map();
  if (classIds.length) {
    const fields = includePayFields
      ? 'id, name, teacher_id, teacher_pay_policy, teacher_pay_amount'
      : 'id, name, teacher_id';
    const { data: classes, error } = await supabase.from('classes').select(fields).in('id', classIds);
    if (error) throw error;
    const teacherIds = [...new Set((classes || []).map((c) => c.teacher_id).filter(Boolean))];
    const teacherMap = await loadProfilesByIds(teacherIds);
    for (const c of classes || []) {
      const teacher = c.teacher_id ? teacherMap.get(String(c.teacher_id)) : null;
      classMap.set(String(c.id), { ...c, teacher_name: teacher?.full_name || null });
    }
  }

  const lessonMap = new Map();
  if (lessonIds.length) {
    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('id, title, order_index')
      .in('id', lessonIds);
    if (error) throw error;
    for (const l of lessons || []) lessonMap.set(String(l.id), l);
  }

  const scheduleMap = new Map();
  if (scheduleIds.length) {
    const { data: schedules, error } = await supabase
      .from('schedules')
      .select('id, day_of_week, start_time, end_time, room_id')
      .in('id', scheduleIds);
    if (error) throw error;
    const roomIds = [...new Set((schedules || []).map((s) => s.room_id).filter(Boolean))];
    const roomMap = new Map();
    if (roomIds.length) {
      const { data: rooms, error: rErr } = await supabase
        .from('facilities')
        .select('id, name')
        .in('id', roomIds);
      if (rErr) throw rErr;
      for (const r of rooms || []) roomMap.set(String(r.id), r);
    }
    for (const s of schedules || []) {
      scheduleMap.set(String(s.id), {
        ...s,
        room_name: s.room_id ? roomMap.get(String(s.room_id))?.name || null : null,
      });
    }
  }

  return rows.map((row) => {
    const cls = classMap.get(String(row.class_id));
    const lesson = row.lesson_id ? lessonMap.get(String(row.lesson_id)) : null;
    const schedule = row.schedule_id ? scheduleMap.get(String(row.schedule_id)) : null;
    const jsDay = row.session_date ? parseLocalDate(row.session_date).getDay() : null;

    return {
      ...row,
      class_name: cls?.name || null,
      teacher_id: cls?.teacher_id || null,
      teacher_name: cls?.teacher_name || null,
      ...(includePayFields
        ? {
            teacher_pay_policy: cls?.teacher_pay_policy || 'none',
            teacher_pay_amount: Number(cls?.teacher_pay_amount || 0),
          }
        : {}),
      schedule_day_label: schedule
        ? DAY_LABELS[Number(schedule.day_of_week)] || null
        : (jsDay != null ? DAY_LABELS[jsDay] : null),
      schedule_day_of_week: schedule?.day_of_week ?? null,
      room_name: schedule?.room_name || null,
      from_schedule: !!row.schedule_id,
      lesson_title: lesson?.title || null,
    };
  });
}

module.exports = { enrichSessionRows, DAY_LABELS, parseLocalDate };

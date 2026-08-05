const { supabase } = require('../config/database');
const {
  getReviewEditMeta,
  assertCanEditSessionRecord,
} = require('../utils/sessionReview');
const { enrichSessionRows, DAY_LABELS, parseLocalDate } = require('../utils/enrichClassSessions');
const { loadProfilesByIds } = require('../utils/enrichClassRows');
const { enrichScheduleRows } = require('./schedules.service');

const formatLocalDate = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

const timeKey = (t) => (t ? String(t).slice(0, 5) : '00:00');

const isSlotActiveOnDate = (slot, classInfo, dateStr) => {
  const jsDay = parseLocalDate(dateStr).getDay();
  if (Number(slot.day_of_week) !== jsDay) return false;

  const slotStart = slot.start_date ? String(slot.start_date).slice(0, 10) : null;
  const slotEnd = slot.end_date ? String(slot.end_date).slice(0, 10) : null;
  const classStart = classInfo?.start_date ? String(classInfo.start_date).slice(0, 10) : null;
  const classEnd = classInfo?.end_date ? String(classInfo.end_date).slice(0, 10) : null;

  if (slotStart && dateStr < slotStart) return false;
  if (slotEnd && dateStr > slotEnd) return false;
  if (classStart && dateStr < classStart) return false;
  if (classEnd && dateStr > classEnd) return false;
  return true;
};

const assertCanManageClass = async (classId, user) => {
  if (!user) {
    const err = new Error('Authentication required');
    err.statusCode = 401;
    throw err;
  }
  if (user.role === 'admin') return;
  if (user.role === 'teacher') {
    const { data, error } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('id', classId)
      .single();
    if (error) throw error;
    if (data?.teacher_id === user.id) return;
  }
  const err = new Error('Không có quyền thao tác lớp này');
  err.statusCode = 403;
  throw err;
};

const getRoleClassIds = async (user) => {
  if (!user || user.role === 'admin') return null;
  if (user.role === 'teacher') {
    const { data, error } = await supabase.from('classes').select('id').eq('teacher_id', user.id);
    if (error) throw error;
    return (data || []).map((c) => c.id);
  }
  if (user.role === 'student') {
    const { data, error } = await supabase
      .from('class_students')
      .select('class_id')
      .eq('student_id', user.id);
    if (error) throw error;
    return (data || []).map((e) => e.class_id);
  }
  return [];
};

const listSessions = async (queryParams, user) => {
  const classId = queryParams.class_id || null;
  const from = queryParams.from || null;
  const to = queryParams.to || null;
  const status = queryParams.status || null;

  let query = supabase
    .from('class_sessions')
    .select('*')
    .order('session_date', { ascending: false })
    .order('start_time', { ascending: true });

  if (classId) query = query.eq('class_id', classId);
  if (from) query = query.gte('session_date', from);
  if (to) query = query.lte('session_date', to);
  if (status) query = query.eq('status', status);

  const roleClassIds = await getRoleClassIds(user);
  if (roleClassIds) {
    if (roleClassIds.length === 0) return [];
    query = query.in('class_id', roleClassIds);
  }

  const { data, error } = await query.limit(500);
  if (error) throw error;

  return enrichSessionRows(data || []);
};

const getSessionById = async (sessionId, user) => {
  const { data, error } = await supabase
    .from('class_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const roleClassIds = await getRoleClassIds(user);
  if (roleClassIds && !roleClassIds.includes(data.class_id)) {
    const err = new Error('Không có quyền xem buổi học này');
    err.statusCode = 403;
    throw err;
  }

  const [session] = await enrichSessionRows([data], { includePayFields: true });
  return session;
};

const getSessionAttendance = async (sessionId, user) => {
  const session = await getSessionById(sessionId, user);
  if (!session) return null;

  const { data: records, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('session_id', sessionId)
    .order('role', { ascending: true });

  if (error) throw error;

  const { data: enrollments, error: enrErr } = await supabase
    .from('class_students')
    .select('student_id')
    .eq('class_id', session.class_id)
    .eq('status', 'active');
  if (enrErr) throw enrErr;

  const profileIds = [
    ...new Set([
      ...(records || []).map((r) => r.profile_id),
      ...(enrollments || []).map((e) => e.student_id),
    ]),
  ];
  const profileMap = await loadProfilesByIds(profileIds);

  const recordByProfile = {};
  for (const r of records || []) {
    const profile = profileMap.get(String(r.profile_id));
    recordByProfile[r.profile_id] = {
      id: r.id,
      profile_id: r.profile_id,
      role: r.role,
      status: r.status,
      note: r.note,
      marked_at: r.marked_at,
      full_name: profile?.full_name,
      email: profile?.email,
      phone: profile?.phone,
    };
  }

  const students = (enrollments || []).map((e) => {
    const profile = profileMap.get(String(e.student_id));
    const rec = recordByProfile[e.student_id];
    return {
      profile_id: e.student_id,
      full_name: profile?.full_name,
      email: profile?.email,
      phone: profile?.phone,
      role: 'student',
      status: rec?.status || 'absent',
      note: rec?.note || '',
      record_id: rec?.id || null,
    };
  });

  const teacherRec = session.teacher_id ? recordByProfile[session.teacher_id] : null;
  const teacher = session.teacher_id
    ? {
        profile_id: session.teacher_id,
        full_name: session.teacher_name,
        role: 'teacher',
        status: teacherRec?.status || 'absent',
        note: teacherRec?.note || '',
        record_id: teacherRec?.id || null,
      }
    : null;

  const presentStudents = students.filter((s) => s.status === 'present' || s.status === 'late').length;

  const { data: lessons, error: lesErr } = await supabase
    .from('lessons')
    .select('id, title, order_index, is_published')
    .eq('class_id', session.class_id)
    .order('order_index', { ascending: true });
  if (lesErr) throw lesErr;

  const reviewMeta = getReviewEditMeta(session, user);

  return {
    session,
    teacher,
    students,
    lessons: lessons || [],
    review: reviewMeta,
    review_fields: {
      lesson_id: session.lesson_id || null,
      review_content: session.review_content || '',
      review_students: session.review_students || '',
      review_followup: session.review_followup || '',
    },
    summary: {
      total_students: students.length,
      present_students: presentStudents,
      absent_students: students.length - presentStudents,
      teacher_present: teacher?.status === 'present' || teacher?.status === 'late',
    },
  };
};

const createSession = async (payload, user) => {
  await assertCanManageClass(payload.class_id, user);

  const { data, error } = await supabase
    .from('class_sessions')
    .insert({
      class_id: payload.class_id,
      schedule_id: payload.schedule_id || null,
      session_date: payload.session_date,
      start_time: payload.start_time || null,
      end_time: payload.end_time || null,
      topic: payload.topic || null,
      lesson_id: payload.lesson_id || null,
      status: payload.status || 'scheduled',
      notes: payload.notes || null,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

const updateSession = async (sessionId, payload, user) => {
  const session = await getSessionById(sessionId, user);
  if (!session) return null;
  await assertCanManageClass(session.class_id, user);

  const updateObj = { updated_at: new Date().toISOString() };
  if (payload.session_date !== undefined) updateObj.session_date = payload.session_date;
  if (payload.start_time !== undefined) updateObj.start_time = payload.start_time;
  if (payload.end_time !== undefined) updateObj.end_time = payload.end_time;
  if (payload.topic !== undefined) updateObj.topic = payload.topic;
  if (payload.status !== undefined) updateObj.status = payload.status;
  if (payload.notes !== undefined) updateObj.notes = payload.notes;
  if (payload.lesson_id !== undefined) updateObj.lesson_id = payload.lesson_id || null;

  const touchesReview =
    payload.review_content !== undefined ||
    payload.review_students !== undefined ||
    payload.review_followup !== undefined ||
    payload.lesson_id !== undefined;
  if (touchesReview) {
    assertCanEditSessionRecord(session, user);
    if (payload.review_content !== undefined) updateObj.review_content = payload.review_content || null;
    if (payload.review_students !== undefined) updateObj.review_students = payload.review_students || null;
    if (payload.review_followup !== undefined) updateObj.review_followup = payload.review_followup || null;
    updateObj.review_submitted_at = new Date().toISOString();
    updateObj.review_submitted_by = user.id;
  }

  const { data, error } = await supabase
    .from('class_sessions')
    .update(updateObj)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

const removeSession = async (sessionId, user) => {
  const session = await getSessionById(sessionId, user);
  if (!session) return null;
  await assertCanManageClass(session.class_id, user);

  const { data: paidPay, error: payErr } = await supabase
    .from('teacher_pay_entries')
    .select('id')
    .eq('session_id', sessionId)
    .eq('status', 'paid')
    .maybeSingle();
  if (payErr) throw payErr;
  if (paidPay) {
    throw new Error('Buổi đã chi trả lương giáo viên, không thể xóa');
  }

  await supabase
    .from('teacher_pay_entries')
    .delete()
    .eq('session_id', sessionId)
    .in('status', ['pending', 'cancelled']);

  const { error } = await supabase.from('class_sessions').delete().eq('id', sessionId);
  if (error) throw error;
  return { id: sessionId };
};

const saveAttendance = async (sessionId, payload, user) => {
  const session = await getSessionById(sessionId, user);
  if (!session) return null;
  await assertCanManageClass(session.class_id, user);
  assertCanEditSessionRecord(session, user);

  const now = new Date().toISOString();
  const rows = [];

  if (payload.teacher && session.teacher_id) {
    rows.push({
      session_id: sessionId,
      profile_id: session.teacher_id,
      role: 'teacher',
      status: payload.teacher.status || 'absent',
      note: payload.teacher.note || null,
      marked_at: now,
      marked_by: user.id,
      updated_at: now,
    });
  }

  for (const s of payload.students || []) {
    rows.push({
      session_id: sessionId,
      profile_id: s.profile_id,
      role: 'student',
      status: s.status || 'absent',
      note: s.note || null,
      marked_at: now,
      marked_by: user.id,
      updated_at: now,
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase
      .from('attendance_records')
      .upsert(rows, { onConflict: 'session_id,profile_id' });
    if (error) throw error;
  }

  const sessionUpdate = { updated_at: now };
  if (payload.lesson_id !== undefined) sessionUpdate.lesson_id = payload.lesson_id || null;
  if (payload.review_content !== undefined) sessionUpdate.review_content = payload.review_content || null;
  if (payload.review_students !== undefined) sessionUpdate.review_students = payload.review_students || null;
  if (payload.review_followup !== undefined) sessionUpdate.review_followup = payload.review_followup || null;
  const hasReviewPayload =
    payload.lesson_id !== undefined ||
    payload.review_content !== undefined ||
    payload.review_students !== undefined ||
    payload.review_followup !== undefined;
  if (hasReviewPayload) {
    sessionUpdate.review_submitted_at = now;
    sessionUpdate.review_submitted_by = user.id;
  }
  if (payload.mark_completed !== false) sessionUpdate.status = 'completed';

  await supabase.from('class_sessions').update(sessionUpdate).eq('id', sessionId);

  // Tự sinh khoản chi GV theo buổi nếu có cấu hình
  try {
    const teacherPayroll = require('./teacherPayroll.service');
    await teacherPayroll.syncPayEntryForSession(sessionId, user.id);
  } catch (e) {
    if (e.code !== '42P01') throw e;
  }

  return getSessionAttendance(sessionId, user);
};

const findSessionForSlot = (sessions, scheduleId, sessionDate, startTime) => {
  const bySchedule = sessions.find(
    (s) => s.schedule_id === scheduleId && s.session_date === sessionDate
  );
  if (bySchedule) return bySchedule;
  const tk = `${sessionDate}|${timeKey(startTime)}`;
  return sessions.find(
    (s) => s.session_date === sessionDate && `${s.session_date}|${timeKey(s.start_time)}` === tk
  ) || null;
};

/** Lịch buổi học gắn với từng ca TKB đã tạo. */
const getClassScheduleCalendar = async (classId, fromDate, toDate, user) => {
  const roleClassIds = await getRoleClassIds(user);
  if (roleClassIds && !roleClassIds.includes(classId)) {
    const err = new Error('Không có quyền xem lớp này');
    err.statusCode = 403;
    throw err;
  }

  const { data: rawSchedules, error: schErr } = await supabase
    .from('schedules')
    .select('id, day_of_week, start_time, end_time, start_date, end_date, is_active, class_id, room_id')
    .eq('class_id', classId)
    .eq('is_active', true)
    .order('day_of_week')
    .order('start_time');
  if (schErr) throw schErr;
  const schedules = await enrichScheduleRows(rawSchedules || []);

  const { data: cls, error: clsErr } = await supabase
    .from('classes')
    .select('id, name, start_date, end_date')
    .eq('id', classId)
    .single();
  if (clsErr) throw clsErr;

  const { data: rawSessions, error: sessErr } = await supabase
    .from('class_sessions')
    .select('id, schedule_id, session_date, start_time, end_time, status, topic, notes, lesson_id')
    .eq('class_id', classId)
    .gte('session_date', fromDate)
    .lte('session_date', toDate);
  if (sessErr) throw sessErr;

  const sessionList = await enrichSessionRows(rawSessions || []);
  const slots = [];
  const usedSessionIds = new Set();

  for (let d = parseLocalDate(fromDate); ; d.setDate(d.getDate() + 1)) {
    const sessionDate = formatLocalDate(d);
    if (sessionDate > toDate) break;

    for (const sch of schedules || []) {
      if (!isSlotActiveOnDate(sch, cls, sessionDate)) continue;

      const matched = findSessionForSlot(sessionList, sch.id, sessionDate, sch.start_time);
      if (matched) usedSessionIds.add(matched.id);

      const jsDay = parseLocalDate(sessionDate).getDay();
      slots.push({
        schedule_id: sch.id,
        session_date: sessionDate,
        day_of_week: sch.day_of_week,
        day_label: DAY_LABELS[jsDay] || DAY_LABELS[Number(sch.day_of_week)],
        start_time: sch.start_time,
        end_time: sch.end_time,
        room_name: sch.room_name || null,
        session_id: matched?.id || null,
        session_status: matched?.status || null,
        lesson_title: matched?.lesson_title || null,
        linked: !!matched,
        schedule_linked: matched?.schedule_id === sch.id,
      });
    }
  }

  slots.sort((a, b) => {
    if (a.session_date !== b.session_date) return b.session_date.localeCompare(a.session_date);
    return timeKey(a.start_time).localeCompare(timeKey(b.start_time));
  });

  const orphanSessions = sessionList
    .filter((s) => !usedSessionIds.has(s.id))
    .map((s) => ({
      session_id: s.id,
      session_date: s.session_date,
      start_time: s.start_time,
      end_time: s.end_time,
      session_status: s.status,
      topic: s.topic,
      notes: s.notes,
      lesson_title: s.lesson_title || null,
      schedule_id: s.schedule_id,
      from_schedule: !!s.schedule_id,
      day_label: DAY_LABELS[parseLocalDate(s.session_date).getDay()],
    }));

  const linked = slots.filter((s) => s.linked).length;
  return {
    class: cls,
    schedules: (schedules || []).map((s) => ({
      id: s.id,
      day_of_week: s.day_of_week,
      day_label: DAY_LABELS[Number(s.day_of_week)],
      start_time: s.start_time,
      end_time: s.end_time,
      room_name: s.room_name || null,
      start_date: s.start_date,
      end_date: s.end_date,
    })),
    slots,
    orphan_sessions: orphanSessions,
    summary: {
      schedule_slot_count: slots.length,
      linked_count: linked,
      missing_count: slots.length - linked,
      orphan_session_count: orphanSessions.length,
    },
  };
};

/** Tạo hoặc trả về buổi học đã gắn schedule_id. */
const ensureSessionFromSchedule = async (classId, scheduleId, sessionDate, user) => {
  await assertCanManageClass(classId, user);

  const { data: sch, error: schErr } = await supabase
    .from('schedules')
    .select('id, class_id, day_of_week, start_time, end_time, start_date, end_date')
    .eq('id', scheduleId)
    .single();
  if (schErr) throw schErr;
  if (sch.class_id !== classId) throw new Error('Ca TKB không thuộc lớp này');

  const { data: cls } = await supabase
    .from('classes')
    .select('start_date, end_date')
    .eq('id', classId)
    .single();

  if (!isSlotActiveOnDate(sch, cls, sessionDate)) {
    throw new Error('Ngày này không có ca học theo thời khóa biểu');
  }

  const { data: existingBySchedule } = await supabase
    .from('class_sessions')
    .select('*')
    .eq('class_id', classId)
    .eq('schedule_id', scheduleId)
    .eq('session_date', sessionDate)
    .maybeSingle();

  if (existingBySchedule) return existingBySchedule;

  const { data: existingByTime } = await supabase
    .from('class_sessions')
    .select('*')
    .eq('class_id', classId)
    .eq('session_date', sessionDate)
    .eq('start_time', sch.start_time)
    .maybeSingle();

  if (existingByTime) {
    if (!existingByTime.schedule_id) {
      const { data: linked, error: linkErr } = await supabase
        .from('class_sessions')
        .update({
          schedule_id: scheduleId,
          end_time: sch.end_time || existingByTime.end_time,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingByTime.id)
        .select()
        .single();
      if (linkErr) throw linkErr;
      return linked;
    }
    return existingByTime;
  }

  const { data: created, error: insErr } = await supabase
    .from('class_sessions')
    .insert({
      class_id: classId,
      schedule_id: scheduleId,
      session_date: sessionDate,
      start_time: sch.start_time,
      end_time: sch.end_time,
      status: 'scheduled',
      created_by: user.id,
    })
    .select()
    .single();

  if (insErr) {
    if (insErr.code === '23505') {
      const { data: again } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('class_id', classId)
        .eq('session_date', sessionDate)
        .eq('start_time', sch.start_time)
        .maybeSingle();
      return again;
    }
    throw insErr;
  }
  return created;
};

const generateSessionsFromSchedule = async (classId, fromDate, toDate, user) => {
  await assertCanManageClass(classId, user);

  const calendar = await getClassScheduleCalendar(classId, fromDate, toDate, user);
  let created = 0;
  let skipped = 0;
  let linked = 0;

  for (const slot of calendar.slots) {
    if (slot.linked) {
      if (!slot.schedule_linked && slot.session_id) {
        await supabase
          .from('class_sessions')
          .update({ schedule_id: slot.schedule_id, updated_at: new Date().toISOString() })
          .eq('id', slot.session_id);
        linked += 1;
      }
      skipped += 1;
      continue;
    }
    try {
      await ensureSessionFromSchedule(classId, slot.schedule_id, slot.session_date, user);
      created += 1;
    } catch (e) {
      if (e.code === '23505') skipped += 1;
      else throw e;
    }
  }

  return { created, skipped, linked, from: fromDate, to: toDate };
};

const getStudentAttendanceSummary = async (studentId, queryParams) => {
  const from = queryParams.from || null;
  const to = queryParams.to || null;

  const { data, error } = await supabase
    .from('attendance_records')
    .select('status, session_id')
    .eq('profile_id', studentId)
    .eq('role', 'student');

  if (error) throw error;

  const sessionIds = [...new Set((data || []).map((r) => r.session_id).filter(Boolean))];
  const sessionMap = new Map();
  const classMap = new Map();

  if (sessionIds.length) {
    const { data: sessions, error: sErr } = await supabase
      .from('class_sessions')
      .select('id, session_date, class_id')
      .in('id', sessionIds);
    if (sErr) throw sErr;

    const classIds = [...new Set((sessions || []).map((s) => s.class_id).filter(Boolean))];
    if (classIds.length) {
      const { data: classes, error: cErr } = await supabase
        .from('classes')
        .select('id, name')
        .in('id', classIds);
      if (cErr) throw cErr;
      for (const c of classes || []) classMap.set(String(c.id), c);
    }

    for (const s of sessions || []) {
      sessionMap.set(String(s.id), {
        ...s,
        class_name: classMap.get(String(s.class_id))?.name || null,
      });
    }
  }

  let rows = (data || []).map((r) => ({
    status: r.status,
    session: sessionMap.get(String(r.session_id)) || null,
  }));
  if (from) rows = rows.filter((r) => r.session?.session_date >= from);
  if (to) rows = rows.filter((r) => r.session?.session_date <= to);

  const counts = { present: 0, absent: 0, late: 0, excused: 0, total: rows.length };
  for (const r of rows) {
    if (counts[r.status] !== undefined) counts[r.status] += 1;
  }

  return {
    summary: counts,
    records: rows.map((r) => ({
      status: r.status,
      session_date: r.session?.session_date,
      class_id: r.session?.class_id,
      class_name: r.session?.class_name,
      session_id: r.session?.id,
    })),
  };
};

module.exports = {
  listSessions,
  getSessionById,
  getSessionAttendance,
  createSession,
  updateSession,
  removeSession,
  saveAttendance,
  getClassScheduleCalendar,
  ensureSessionFromSchedule,
  generateSessionsFromSchedule,
  getStudentAttendanceSummary,
  assertCanManageClass,
};

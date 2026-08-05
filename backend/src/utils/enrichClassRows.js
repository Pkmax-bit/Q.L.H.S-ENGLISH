const { supabase } = require('../config/database');

async function enrichClassRows(rows) {
  if (!rows?.length) return [];

  const subjectIds = [...new Set(rows.map((r) => r.subject_id).filter(Boolean))];
  const teacherIds = [...new Set(rows.map((r) => r.teacher_id).filter(Boolean))];

  const subjectMap = new Map();
  const teacherMap = new Map();

  if (subjectIds.length) {
    const { data, error } = await supabase
      .from('subjects')
      .select('id, name, code')
      .in('id', subjectIds);
    if (error) throw error;
    for (const s of data || []) subjectMap.set(String(s.id), s);
  }

  if (teacherIds.length) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email, phone')
      .in('id', teacherIds);
    if (error) throw error;
    for (const t of data || []) teacherMap.set(String(t.id), t);
  }

  return rows.map((row) => {
    const sub = row.subject_id ? subjectMap.get(String(row.subject_id)) : null;
    const teacher = row.teacher_id ? teacherMap.get(String(row.teacher_id)) : null;
    return {
      ...row,
      subject_name: sub?.name || null,
      subject_code: sub?.code || null,
      teacher_name: teacher?.full_name || null,
      teacher_avatar_url: teacher?.avatar_url || null,
      teacher_email: teacher?.email || null,
      teacher_phone: teacher?.phone || null,
    };
  });
}

async function loadProfilesByIds(ids) {
  const unique = [...new Set((ids || []).filter(Boolean))];
  const map = new Map();
  if (!unique.length) return map;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, avatar_url, is_active')
    .in('id', unique);
  if (error) throw error;
  for (const p of data || []) map.set(String(p.id), p);
  return map;
}

module.exports = { enrichClassRows, loadProfilesByIds };

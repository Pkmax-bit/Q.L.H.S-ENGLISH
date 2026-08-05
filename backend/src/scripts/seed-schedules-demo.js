/**
 * Seed dữ liệu mẫu THỜI KHÓA BIỂU — nhiều ca, nhiều phòng, đủ 7 ngày.
 * Chạy: cd backend && npm run seed:schedules
 * (Nên chạy npm run seed:demo trước nếu chưa có lớp [DEMO])
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY,
);

const DEMO_PREFIX = '[DEMO]';
const SCHEDULE_START = '2026-01-06';
const SCHEDULE_END = '2026-12-31';

const ROOMS = [
  { name: `${DEMO_PREFIX} Phòng 201`, type: 'classroom', capacity: 20 },
  { name: `${DEMO_PREFIX} Phòng 202`, type: 'classroom', capacity: 16 },
  { name: `${DEMO_PREFIX} Phòng Lab`, type: 'lab', capacity: 12 },
];

/** class name substring → slots (day_of_week 0=CN … 6=T7) */
const TIMETABLE = {
  'Tiếng Anh giao tiếp A1': [
    { day_of_week: 1, start_time: '08:00', end_time: '09:30', room: 0 },
    { day_of_week: 3, start_time: '08:00', end_time: '09:30', room: 0 },
    { day_of_week: 1, start_time: '18:00', end_time: '19:30', room: 0 },
    { day_of_week: 3, start_time: '18:00', end_time: '19:30', room: 0 },
    { day_of_week: 5, start_time: '18:00', end_time: '19:30', room: 0 },
  ],
  'IELTS Foundation 5.0': [
    { day_of_week: 2, start_time: '19:00', end_time: '21:00', room: 1 },
    { day_of_week: 4, start_time: '19:00', end_time: '21:00', room: 1 },
    { day_of_week: 6, start_time: '14:00', end_time: '16:00', room: 1 },
  ],
  'TOEIC 600+': [
    { day_of_week: 6, start_time: '08:00', end_time: '11:00', room: 0 },
    { day_of_week: 0, start_time: '09:00', end_time: '12:00', room: 2 },
  ],
};

/** Lớp bổ sung chỉ cho TKB (tạo nếu chưa có) */
const EXTRA_CLASS = {
  name: `${DEMO_PREFIX} Kids English (6-10 tuổi)`,
  description: 'Lớp tiếng Anh trẻ em — ca sáng & chiều',
  subjectCode: 'ENG-GT',
  slots: [
    { day_of_week: 2, start_time: '16:00', end_time: '17:00', room: 2 },
    { day_of_week: 4, start_time: '16:00', end_time: '17:00', room: 2 },
    { day_of_week: 6, start_time: '09:00', end_time: '10:30', room: 2 },
  ],
};

async function ensureRoom(spec) {
  const { data: existing } = await supabase
    .from('facilities')
    .select('id')
    .eq('name', spec.name)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from('facilities')
    .insert({
      name: spec.name,
      type: spec.type,
      capacity: spec.capacity,
      status: 'available',
      address: 'Cơ sở chính',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function getDemoClasses() {
  const { data, error } = await supabase
    .from('classes')
    .select('id, name, subject_id, teacher_id')
    .ilike('name', `${DEMO_PREFIX}%`)
    .eq('status', 'active');
  if (error) throw error;
  return data || [];
}

async function ensureSubjectEngGt() {
  const { data: existing } = await supabase.from('subjects').select('id').eq('code', 'ENG-GT').maybeSingle();
  if (existing?.id) return existing.id;
  const { data, error } = await supabase
    .from('subjects')
    .insert({ name: 'Tiếng Anh giao tiếp', code: 'ENG-GT', description: 'Seed TKB' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function ensureTeacher() {
  const { data } = await supabase.from('profiles').select('id').eq('role', 'teacher').limit(1).maybeSingle();
  if (!data?.id) throw new Error('Chưa có giáo viên. Chạy: npm run seed');
  return data.id;
}

async function upsertExtraClass(subjectId, teacherId) {
  const { data: existing } = await supabase
    .from('classes')
    .select('id, name')
    .eq('name', EXTRA_CLASS.name)
    .maybeSingle();

  if (existing?.id) return existing;

  const { data, error } = await supabase
    .from('classes')
    .insert({
      name: EXTRA_CLASS.name,
      subject_id: subjectId,
      teacher_id: teacherId,
      description: EXTRA_CLASS.description,
      max_students: 15,
      status: 'active',
      start_date: SCHEDULE_START,
      end_date: SCHEDULE_END,
      fee_policy: 'per_session',
      fee_amount: 100000,
      sessions_per_period: 8,
    })
    .select('id, name')
    .single();
  if (error) throw error;
  return data;
}

async function upsertSlot(classId, slot, roomIds) {
  const roomId = roomIds[slot.room] || roomIds[0];
  const { data: existing, error: selErr } = await supabase
    .from('schedules')
    .select('id')
    .eq('class_id', classId)
    .eq('day_of_week', slot.day_of_week)
    .eq('start_time', slot.start_time)
    .maybeSingle();
  if (selErr) throw selErr;

  const payload = {
    class_id: classId,
    day_of_week: slot.day_of_week,
    start_time: slot.start_time,
    end_time: slot.end_time,
    room_id: roomId,
    is_active: true,
    start_date: SCHEDULE_START,
    end_date: SCHEDULE_END,
  };

  if (existing?.id) {
    const { error } = await supabase.from('schedules').update(payload).eq('id', existing.id);
    if (error) throw error;
    return 'updated';
  }
  const { error } = await supabase.from('schedules').insert(payload);
  if (error) throw error;
  return 'created';
}

function matchClass(classes, key) {
  return classes.find((c) => c.name.includes(key));
}

async function main() {
  if (!process.env.SUPABASE_URL) {
    console.error('Thiếu SUPABASE_URL trong backend/.env');
    process.exit(1);
  }

  console.log('📅 Seed thời khóa biểu mẫu...\n');

  const roomIds = [];
  for (const r of ROOMS) {
    const id = await ensureRoom(r);
    roomIds.push(id);
    console.log(`  Phòng: ${r.name}`);
  }

  let classes = await getDemoClasses();
  if (!classes.length) {
    console.log('\n⚠️  Chưa có lớp [DEMO]. Đang chạy seed:demo...');
    const { execSync } = require('child_process');
    execSync('node src/scripts/seed-demo-data.js', { stdio: 'inherit', cwd: require('path').join(__dirname, '../..') });
    classes = await getDemoClasses();
  }

  const teacherId = await ensureTeacher();
  const subjectId = await ensureSubjectEngGt();
  const extra = await upsertExtraClass(subjectId, teacherId);
  if (!classes.some((c) => c.id === extra.id)) classes.push(extra);

  let created = 0;
  let updated = 0;

  for (const [key, slots] of Object.entries(TIMETABLE)) {
    const cls = matchClass(classes, key);
    if (!cls) {
      console.log(`  ⚠ Bỏ qua — không tìm thấy lớp chứa "${key}"`);
      continue;
    }
    for (const slot of slots) {
      const r = await upsertSlot(cls.id, slot, roomIds);
      if (r === 'created') created++;
      else updated++;
    }
    console.log(`  ✓ ${cls.name}: ${slots.length} ca`);
  }

  for (const slot of EXTRA_CLASS.slots) {
    const r = await upsertSlot(extra.id, slot, roomIds);
    if (r === 'created') created++;
    else updated++;
  }
  console.log(`  ✓ ${extra.name}: ${EXTRA_CLASS.slots.length} ca`);

  const { count } = await supabase
    .from('schedules')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  console.log('\n---');
  console.log(`Tạo mới: ${created} ca · Cập nhật: ${updated} ca`);
  console.log(`Tổng ca active trên hệ thống: ${count ?? '?'}`);
  console.log('Xem tại: Thời khóa biểu → Kanban / Tuần / Hôm nay');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

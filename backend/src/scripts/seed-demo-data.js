/**
 * Dữ liệu mẫu: môn học, học sinh, lớp, bài học, thời khóa biểu.
 * Chạy: cd backend && npm run seed:demo
 * Cần .env: SUPABASE_URL, SUPABASE_SERVICE_KEY (hoặc SUPABASE_KEY)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY,
);

const DEMO_PREFIX = '[DEMO]';
const CLASS_START = '2026-01-06';
const CLASS_END = '2026-12-31';
const STUDENT_PASSWORD = 'Test@123';

const SUBJECTS = [
  { code: 'ENG-GT', name: 'Tiếng Anh giao tiếp', description: 'Khóa giao tiếp cơ bản — A1/A2' },
  { code: 'IELTS-F', name: 'IELTS Foundation', description: 'Luyện thi IELTS band 5.0–6.0' },
  { code: 'TOEIC-R', name: 'TOEIC Listening & Reading', description: 'Luyện thi TOEIC 500–750' },
];

const STUDENTS = [
  { email: 'demo-hs-01@edu.test', full_name: 'Trần Thị Mai', phone: '0912000001' },
  { email: 'demo-hs-02@edu.test', full_name: 'Lê Hoàng Nam', phone: '0912000002' },
  { email: 'demo-hs-03@edu.test', full_name: 'Phạm Thu Hà', phone: '0912000003' },
  { email: 'demo-hs-04@edu.test', full_name: 'Võ Minh Tuấn', phone: '0912000004' },
  { email: 'demo-hs-05@edu.test', full_name: 'Đỗ Ngọc Linh', phone: '0912000005' },
  { email: 'demo-hs-06@edu.test', full_name: 'Bùi Quốc Huy', phone: '0912000006' },
  { email: 'demo-hs-07@edu.test', full_name: 'Nguyễn Thảo Vy', phone: '0912000007' },
  { email: 'demo-hs-08@edu.test', full_name: 'Hoàng Đức Anh', phone: '0912000008' },
];

const CLASSES = [
  {
    key: 'gt-a1',
    name: `${DEMO_PREFIX} Tiếng Anh giao tiếp A1`,
    subjectCode: 'ENG-GT',
    description: 'Lớp giao tiếp buổi tối — 3 ca/tuần',
    fee_policy: 'per_session',
    fee_amount: 120000,
    sessions_per_period: 12,
  },
  {
    key: 'ielts-f',
    name: `${DEMO_PREFIX} IELTS Foundation 5.0`,
    subjectCode: 'IELTS-F',
    description: 'Luyện 4 kỹ năng IELTS — 2 ca/tuần',
    fee_policy: 'monthly',
    fee_amount: 2500000,
    sessions_per_period: 0,
  },
  {
    key: 'toeic-600',
    name: `${DEMO_PREFIX} TOEIC 600+`,
    subjectCode: 'TOEIC-R',
    description: 'Luyện nghe & đọc TOEIC — cuối tuần',
    fee_policy: 'per_session',
    fee_amount: 180000,
    sessions_per_period: 8,
  },
];

const LESSONS_BY_CLASS = {
  'gt-a1': [
    { title: 'Unit 1 — Greetings & Introductions', content: 'Học chào hỏi, giới thiệu bản thân, hỏi tên và nghề nghiệp.', order_index: 1 },
    { title: 'Unit 2 — Daily routines', content: 'Thì hiện tại đơn, từ vựng hoạt động hàng ngày.', order_index: 2 },
    { title: 'Unit 3 — At the café', content: 'Gọi món, hỏi giá, luyện hội thoại ngắn.', order_index: 3 },
    { title: 'Unit 4 — Directions', content: 'Hỏi đường, chỉ phương hướng, giới từ nơi chốn.', order_index: 4 },
  ],
  'ielts-f': [
    { title: 'Listening — Form completion', content: 'Kỹ năng điền form, luyện nghe Part 1.', order_index: 1 },
    { title: 'Reading — True/False/Not Given', content: 'Chiến lược làm bài T/F/NG.', order_index: 2 },
    { title: 'Writing Task 1 — Line graph', content: 'Mô tả biểu đồ đường, từ vựng xu hướng.', order_index: 3 },
    { title: 'Speaking Part 1 — Familiar topics', content: 'Luyện trả lời câu hỏi quen thuộc.', order_index: 4 },
  ],
  'toeic-600': [
    { title: 'Part 1 — Photographs', content: 'Mô tả tranh, loại trừ bẫy âm thanh tương tự.', order_index: 1 },
    { title: 'Part 5 — Incomplete sentences', content: 'Ngữ pháp và từ loại trong câu.', order_index: 2 },
    { title: 'Part 6 — Text completion', content: 'Điền từ đoạn văn ngắn.', order_index: 3 },
    { title: 'Part 7 — Single passages', content: 'Đọc hiểu email và thông báo.', order_index: 4 },
  ],
};

/** day_of_week: 0=CN, 1=T2 … 6=T7 */
const SCHEDULES_BY_CLASS = {
  'gt-a1': [
    { day_of_week: 1, start_time: '18:00', end_time: '19:30' },
    { day_of_week: 3, start_time: '18:00', end_time: '19:30' },
    { day_of_week: 5, start_time: '18:00', end_time: '19:30' },
  ],
  'ielts-f': [
    { day_of_week: 2, start_time: '19:00', end_time: '21:00' },
    { day_of_week: 4, start_time: '19:00', end_time: '21:00' },
  ],
  'toeic-600': [
    { day_of_week: 6, start_time: '08:00', end_time: '11:00' },
  ],
};

async function ensureTeacher() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'teacher')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) {
    throw new Error('Chưa có giáo viên. Chạy: npm run seed');
  }
  return data;
}

async function upsertSubject(spec) {
  const { data: existing, error: selErr } = await supabase
    .from('subjects')
    .select('id')
    .eq('code', spec.code)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing?.id) {
    const { error } = await supabase
      .from('subjects')
      .update({
        name: spec.name,
        description: spec.description,
        is_active: true,
      })
      .eq('id', existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase
    .from('subjects')
    .insert({ ...spec, is_active: true })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function ensureStudent(spec, passwordHash) {
  const { data: existing, error: selErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', spec.email)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      email: spec.email,
      password_hash: passwordHash,
      role: 'student',
      full_name: spec.full_name,
      phone: spec.phone,
      is_active: true,
    })
    .select('id')
    .single();
  if (error) throw error;
  console.log(`  + HS: ${spec.email} / ${STUDENT_PASSWORD}`);
  return data.id;
}

async function ensureRoom() {
  const name = `${DEMO_PREFIX} Phòng 201`;
  const { data: existing, error: selErr } = await supabase
    .from('facilities')
    .select('id')
    .eq('name', name)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from('facilities')
    .insert({
      name,
      type: 'classroom',
      capacity: 20,
      status: 'available',
      address: 'Cơ sở chính — Tầng 2',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function upsertClass(spec, subjectId, teacherId) {
  const { data: existing, error: selErr } = await supabase
    .from('classes')
    .select('id')
    .eq('name', spec.name)
    .maybeSingle();
  if (selErr) throw selErr;

  const payload = {
    subject_id: subjectId,
    teacher_id: teacherId,
    description: spec.description,
    max_students: 24,
    status: 'active',
    start_date: CLASS_START,
    end_date: CLASS_END,
    fee_policy: spec.fee_policy,
    fee_amount: spec.fee_amount,
    sessions_per_period: spec.sessions_per_period,
    billing_day: 1,
  };

  if (existing?.id) {
    const { error } = await supabase.from('classes').update(payload).eq('id', existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase
    .from('classes')
    .insert({ ...payload, name: spec.name })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function enrollStudents(classId, studentIds) {
  for (const studentId of studentIds) {
    const { data: row, error: findErr } = await supabase
      .from('class_students')
      .select('id')
      .eq('class_id', classId)
      .eq('student_id', studentId)
      .maybeSingle();
    if (findErr) throw findErr;

    if (!row?.id) {
      const { error } = await supabase.from('class_students').insert({
        class_id: classId,
        student_id: studentId,
        enrollment_date: CLASS_START,
        status: 'active',
      });
      if (error) throw error;
    }
  }
}

async function upsertLessons(classId, lessons, teacherId) {
  for (const lesson of lessons) {
    const { data: existing, error: selErr } = await supabase
      .from('lessons')
      .select('id')
      .eq('class_id', classId)
      .eq('title', lesson.title)
      .maybeSingle();
    if (selErr) throw selErr;

    const payload = {
      class_id: classId,
      title: lesson.title,
      content: lesson.content,
      content_type: 'text',
      order_index: lesson.order_index,
      is_published: true,
      is_template: false,
      created_by: teacherId,
    };

    if (existing?.id) {
      const { error } = await supabase.from('lessons').update(payload).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('lessons').insert(payload);
      if (error) throw error;
    }
  }
}

async function upsertSchedules(classId, slots, roomId) {
  for (const slot of slots) {
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
      start_date: CLASS_START,
      end_date: CLASS_END,
    };

    if (existing?.id) {
      const { error } = await supabase.from('schedules').update(payload).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('schedules').insert(payload);
      if (error) throw error;
    }
  }
}

async function main() {
  if (!process.env.SUPABASE_URL) {
    console.error('Thiếu SUPABASE_URL trong backend/.env');
    process.exit(1);
  }

  console.log('🌱 Seed dữ liệu mẫu QLHS...\n');

  const teacher = await ensureTeacher();
  console.log(`Giáo viên: ${teacher.full_name} (${teacher.id})\n`);

  const subjectIds = {};
  console.log('Môn học:');
  for (const s of SUBJECTS) {
    subjectIds[s.code] = await upsertSubject(s);
    console.log(`  ✓ ${s.code} — ${s.name}`);
  }

  const passwordHash = await bcrypt.hash(STUDENT_PASSWORD, 12);
  console.log('\nHọc sinh:');
  const studentIds = [];
  for (const st of STUDENTS) {
    studentIds.push(await ensureStudent(st, passwordHash));
  }
  console.log(`  → ${studentIds.length} học sinh (mật khẩu: ${STUDENT_PASSWORD})`);

  const roomId = await ensureRoom();
  console.log(`\nPhòng học: ${DEMO_PREFIX} Phòng 201`);

  console.log('\nLớp + bài học + thời khóa biểu:');
  const classIds = {};
  for (const cls of CLASSES) {
    const subjectId = subjectIds[cls.subjectCode];
    const classId = await upsertClass(cls, subjectId, teacher.id);
    classIds[cls.key] = classId;

    await enrollStudents(classId, studentIds.slice(0, 6));
    await upsertLessons(classId, LESSONS_BY_CLASS[cls.key], teacher.id);
    await upsertSchedules(classId, SCHEDULES_BY_CLASS[cls.key], roomId);

    const lessonCount = LESSONS_BY_CLASS[cls.key].length;
    const slotCount = SCHEDULES_BY_CLASS[cls.key].length;
    console.log(`  ✓ ${cls.name}`);
    console.log(`      ${lessonCount} bài học · ${slotCount} ca TKB · 6 HS ghi danh`);
  }

  console.log('\n---');
  console.log('Hoàn tất! Đăng nhập HS mẫu: demo-hs-01@edu.test … demo-hs-08@edu.test');
  console.log(`Mật khẩu: ${STUDENT_PASSWORD}`);
  console.log('Xem: Môn học, Học sinh, Bài học, Thời khóa biểu (Kanban/Tuần)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

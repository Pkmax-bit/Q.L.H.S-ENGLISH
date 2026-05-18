/**
 * Tạo / cập nhật 2 lớp TEST cho học phí:
 *   1) Theo buổi: 8 buổi/tháng × đơn giá/buổi
 *   2) Theo tháng: học phí cố định mỗi tháng
 *
 * Chạy: cd backend && node src/scripts/seed-test-classes.js
 * Cần .env: SUPABASE_URL, SUPABASE_SERVICE_KEY (hoặc SUPABASE_KEY)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
);

/** Ngày nhập học chung cho 6 HS test */
const ENROLLMENT_DATE = '2026-01-01';

const CLASS_SESSION = {
  name: '[TEST] Lớp theo buổi — 8 buổi/tháng',
  fee_policy: 'per_session',
  fee_amount: 150000,
  sessions_per_period: 8,
  billing_day: 1,
  description:
    'Lớp test: chế độ theo buổi. Mỗi tháng tính 8 buổi × đơn giá/buổi (giống logic sinh HĐ).',
};

const CLASS_MONTHLY = {
  name: '[TEST] Lớp theo tháng',
  fee_policy: 'monthly',
  fee_amount: 3000000,
  sessions_per_period: 0,
  billing_day: 5,
  description:
    'Lớp test: học phí cố định theo tháng. Ngày chốt sổ hàng tháng có thể chỉnh trong cấu hình.',
};

async function ensureSubject() {
  const { data: rows, error } = await supabase.from('subjects').select('id').limit(1);
  if (error) throw error;
  if (rows?.length) return rows[0].id;

  const { data: created, error: insErr } = await supabase
    .from('subjects')
    .insert({
      name: 'Tiếng Anh',
      code: 'ENG',
      description: 'Seed test',
    })
    .select('id')
    .single();
  if (insErr) throw insErr;
  return created.id;
}

async function ensureTeacher() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'teacher')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) {
    throw new Error('Không có tài khoản teacher nào. Chạy npm run seed trước.');
  }
  return data.id;
}

async function upsertClass(subjectId, teacherId, spec) {
  const base = {
    subject_id: subjectId,
    teacher_id: teacherId,
    max_students: 30,
    status: 'active',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    fee_policy: spec.fee_policy,
    fee_amount: spec.fee_amount,
    sessions_per_period: spec.sessions_per_period,
    billing_day: spec.billing_day,
    description: spec.description,
  };

  const { data: existing } = await supabase.from('classes').select('id').eq('name', spec.name).maybeSingle();

  if (existing?.id) {
    const { error } = await supabase.from('classes').update(base).eq('id', existing.id);
    if (error) throw error;
    console.log(`✏️  Đã cập nhật: ${spec.name} (${existing.id})`);
    return existing.id;
  }

  const { data: row, error } = await supabase
    .from('classes')
    .insert({ ...base, name: spec.name })
    .select('id')
    .single();
  if (error) throw error;
  console.log(`✅ Đã tạo: ${spec.name} (${row.id})`);
  return row.id;
}

/**
 * 6 tài khoản cố định (idempotent): test-class-enroll-1..6@edu.test / Test@123
 */
async function ensureSixTestStudents() {
  const hash = await bcrypt.hash('Test@123', 12);
  const ids = [];
  for (let i = 1; i <= 6; i++) {
    const email = `test-class-enroll-${i}@edu.test`;
    const { data: existing, error: selErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (selErr) throw selErr;
    if (existing?.id) {
      ids.push(existing.id);
      continue;
    }
    const { data: created, error } = await supabase
      .from('profiles')
      .insert({
        email,
        password_hash: hash,
        role: 'student',
        full_name: `Học sinh test ${i}`,
        phone: `091100000${i}`,
      })
      .select('id')
      .single();
    if (error) throw error;
    console.log(`  + Tạo tài khoản HS: ${email} / Test@123`);
    ids.push(created.id);
  }
  return ids;
}

async function enrollStudentsInClass(classId, studentIds) {
  const enrolledAt = `${ENROLLMENT_DATE}T12:00:00.000Z`;
  for (const studentId of studentIds) {
    const { data: row, error: findErr } = await supabase
      .from('class_students')
      .select('id')
      .eq('class_id', classId)
      .eq('student_id', studentId)
      .maybeSingle();
    if (findErr) throw findErr;

    if (row?.id) {
      const { error } = await supabase
        .from('class_students')
        .update({
          enrollment_date: ENROLLMENT_DATE,
          enrolled_at: enrolledAt,
        })
        .eq('id', row.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('class_students').insert({
        class_id: classId,
        student_id: studentId,
        enrollment_date: ENROLLMENT_DATE,
        enrolled_at: enrolledAt,
      });
      if (error) throw error;
    }
  }
}

async function enrollSixStudentsInBothTestClasses(studentIds, classIdSession, classIdMonthly) {
  console.log('');
  console.log(`Ghi danh ${studentIds.length} học sinh (nhập học ${ENROLLMENT_DATE}) vào 2 lớp TEST...`);
  await enrollStudentsInClass(classIdSession, studentIds);
  console.log(`  ✓ [TEST] Theo buổi — ${studentIds.length} HS`);
  await enrollStudentsInClass(classIdMonthly, studentIds);
  console.log(`  ✓ [TEST] Theo tháng — ${studentIds.length} HS`);
}

async function main() {
  if (!process.env.SUPABASE_URL) {
    console.error('Thiếu SUPABASE_URL trong .env');
    process.exit(1);
  }

  const subjectId = await ensureSubject();
  const teacherId = await ensureTeacher();

  console.log('');
  console.log('Subject:', subjectId);
  console.log('Teacher:', teacherId);
  console.log('');

  const idSession = await upsertClass(subjectId, teacherId, CLASS_SESSION);
  const idMonthly = await upsertClass(subjectId, teacherId, CLASS_MONTHLY);

  const studentIds = await ensureSixTestStudents();
  await enrollSixStudentsInBothTestClasses(studentIds, idSession, idMonthly);

  console.log('');
  console.log('---');
  console.log('Theo buổi: đơn giá = tiền / 1 buổi | 8 buổi × đơn giá = 1 tháng (khi sinh HĐ).');
  console.log('Theo tháng: đơn giá = học phí cả tháng.');
  console.log(`HS test: test-class-enroll-1@edu.test … test-class-enroll-6@edu.test (mật khẩu Test@123)`);
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

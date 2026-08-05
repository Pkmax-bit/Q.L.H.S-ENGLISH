-- ========== 022_attendance_payroll.sql ==========
-- Điểm danh học sinh/giáo viên theo buổi + chi trả giáo viên

-- ----- 1. Cấu hình lương GV trên lớp -----
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS teacher_pay_policy VARCHAR(20)
    CHECK (teacher_pay_policy IN ('none', 'per_class', 'per_session'));

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS teacher_pay_amount NUMERIC(12, 2) DEFAULT 0;

-- ----- 2. Buổi học thực tế -----
CREATE TABLE IF NOT EXISTS class_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  session_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  topic TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_class_sessions_unique_slot
  ON class_sessions(class_id, session_date, COALESCE(start_time, '00:00'::time));

CREATE INDEX IF NOT EXISTS idx_class_sessions_class_date
  ON class_sessions(class_id, session_date);

-- ----- 3. Điểm danh -----
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher')),
  status VARCHAR(20) NOT NULL DEFAULT 'absent'
    CHECK (status IN ('present', 'absent', 'late', 'excused')),
  note TEXT,
  marked_at TIMESTAMPTZ,
  marked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_profile ON attendance_records(profile_id);

-- ----- 4. Khoản chi trả giáo viên -----
CREATE TABLE IF NOT EXISTS teacher_pay_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  session_id UUID REFERENCES class_sessions(id) ON DELETE SET NULL,
  pay_policy VARCHAR(20) NOT NULL CHECK (pay_policy IN ('per_class', 'per_session')),
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  description TEXT,
  period_start DATE,
  period_end DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'cancelled')),
  finance_id UUID REFERENCES finances(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_pay_session_unique
  ON teacher_pay_entries(session_id)
  WHERE session_id IS NOT NULL AND status <> 'cancelled';

CREATE INDEX IF NOT EXISTS idx_teacher_pay_teacher ON teacher_pay_entries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_pay_class ON teacher_pay_entries(class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_pay_status ON teacher_pay_entries(status);

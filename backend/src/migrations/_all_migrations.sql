-- ========== 000_extensions.sql ==========
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ========== 001_enrollment_requests.sql ==========
-- ========== enrollment_requests ==========
-- Stores teacher requests to add students to classes, pending admin approval

CREATE TABLE IF NOT EXISTS enrollment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  note TEXT,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent duplicate pending requests for same student+class
  UNIQUE(class_id, student_id, status)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_status ON enrollment_requests(status);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_class ON enrollment_requests(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_requested_by ON enrollment_requests(requested_by);


-- ========== 002_template_permissions.sql ==========
-- ========== template_permissions ==========
-- Controls which templates teachers are allowed to use.
-- If a template has no rows here, only admin can use it.
-- If teacher_id is NULL, ALL teachers can use it.

CREATE TABLE IF NOT EXISTS template_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type VARCHAR(20) NOT NULL CHECK (template_type IN ('lesson', 'assignment')),
  template_id UUID NOT NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique: one permission per template+teacher combo (NULL teacher = all)
  UNIQUE(template_type, template_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_template_permissions_template ON template_permissions(template_type, template_id);
CREATE INDEX IF NOT EXISTS idx_template_permissions_teacher ON template_permissions(teacher_id);


-- ========== 003_schedules_date_range.sql ==========
-- ========== Add date range to schedules ==========
-- Schedules now have start_date and end_date to limit recurring display range.

ALTER TABLE schedules ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS end_date DATE;

CREATE INDEX IF NOT EXISTS idx_schedules_date_range ON schedules(start_date, end_date);


-- ========== 004_submissions.sql ==========
-- ========== submissions ==========
-- Stores student assignment submissions

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
  score NUMERIC(6,2),
  total_points NUMERIC(6,2),
  auto_score NUMERIC(6,2),
  manual_score NUMERIC(6,2),
  feedback TEXT,
  graded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  graded_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  time_spent_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One active submission per student per assignment
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_student_assignment
  ON submissions(assignment_id, student_id)
  WHERE status != 'in_progress';

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

-- ========== submission_answers ==========
-- Individual answers for each question in a submission

CREATE TABLE IF NOT EXISTS submission_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES assignment_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  selected_option_index INTEGER,
  is_correct BOOLEAN,
  score NUMERIC(6,2),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(submission_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_submission_answers_submission ON submission_answers(submission_id);


-- ========== 005_fix_submissions_schema.sql ==========
-- Fix: rename selected_option_id to selected_option_index (if old schema)
-- and change type from TEXT to INTEGER

DO $$
BEGIN
  -- If old column exists, rename and change type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submission_answers' AND column_name = 'selected_option_id'
  ) THEN
    ALTER TABLE submission_answers RENAME COLUMN selected_option_id TO selected_option_index;
    ALTER TABLE submission_answers ALTER COLUMN selected_option_index TYPE INTEGER USING selected_option_index::INTEGER;
    RAISE NOTICE 'Renamed selected_option_id -> selected_option_index (INTEGER)';
  END IF;

  -- If column doesn't exist at all, add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submission_answers' AND column_name = 'selected_option_index'
  ) THEN
    ALTER TABLE submission_answers ADD COLUMN selected_option_index INTEGER;
    RAISE NOTICE 'Added selected_option_index column';
  END IF;

  -- Ensure submissions has all needed columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'auto_score'
  ) THEN
    ALTER TABLE submissions ADD COLUMN auto_score NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'manual_score'
  ) THEN
    ALTER TABLE submissions ADD COLUMN manual_score NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'total_points'
  ) THEN
    ALTER TABLE submissions ADD COLUMN total_points NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE submissions ADD COLUMN started_at TIMESTAMPTZ DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'time_spent_seconds'
  ) THEN
    ALTER TABLE submissions ADD COLUMN time_spent_seconds INTEGER;
  END IF;

  -- Ensure submission_answers has score column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submission_answers' AND column_name = 'score'
  ) THEN
    ALTER TABLE submission_answers ADD COLUMN score NUMERIC(6,2);
  END IF;

  -- Ensure submission_answers has updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submission_answers' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE submission_answers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;

END $$;


-- ========== 006_fix_submission_answers_unique.sql ==========
-- Ensure unique constraint for submission_answers upsert
DO $$
BEGIN
  -- Add unique constraint on (submission_id, question_id) if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'submission_answers_submission_question_unique'
  ) THEN
    -- First delete duplicates if any
    DELETE FROM submission_answers a USING submission_answers b
    WHERE a.id > b.id 
    AND a.submission_id = b.submission_id 
    AND a.question_id = b.question_id;

    ALTER TABLE submission_answers 
    ADD CONSTRAINT submission_answers_submission_question_unique 
    UNIQUE (submission_id, question_id);
    
    RAISE NOTICE 'Added unique constraint on submission_answers(submission_id, question_id)';
  END IF;
END $$;


-- ========== 007_ensure_submission_columns.sql ==========
-- Ensure all submission-related columns exist (safe to run multiple times)
-- Run this in Supabase SQL Editor if you get 500 errors on submit

DO $$
BEGIN
  -- ==========================================
  -- submissions table columns
  -- ==========================================
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'auto_score') THEN
    ALTER TABLE submissions ADD COLUMN auto_score NUMERIC(6,2);
    RAISE NOTICE 'Added submissions.auto_score';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'manual_score') THEN
    ALTER TABLE submissions ADD COLUMN manual_score NUMERIC(6,2);
    RAISE NOTICE 'Added submissions.manual_score';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'total_points') THEN
    ALTER TABLE submissions ADD COLUMN total_points NUMERIC(6,2);
    RAISE NOTICE 'Added submissions.total_points';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'started_at') THEN
    ALTER TABLE submissions ADD COLUMN started_at TIMESTAMPTZ DEFAULT now();
    RAISE NOTICE 'Added submissions.started_at';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'time_spent_seconds') THEN
    ALTER TABLE submissions ADD COLUMN time_spent_seconds INTEGER;
    RAISE NOTICE 'Added submissions.time_spent_seconds';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'updated_at') THEN
    ALTER TABLE submissions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    RAISE NOTICE 'Added submissions.updated_at';
  END IF;

  -- ==========================================
  -- submission_answers table columns
  -- ==========================================
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'selected_option_index') THEN
    ALTER TABLE submission_answers ADD COLUMN selected_option_index INTEGER;
    RAISE NOTICE 'Added submission_answers.selected_option_index';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'score') THEN
    ALTER TABLE submission_answers ADD COLUMN score NUMERIC(6,2);
    RAISE NOTICE 'Added submission_answers.score';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'feedback') THEN
    ALTER TABLE submission_answers ADD COLUMN feedback TEXT;
    RAISE NOTICE 'Added submission_answers.feedback';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'updated_at') THEN
    ALTER TABLE submission_answers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    RAISE NOTICE 'Added submission_answers.updated_at';
  END IF;

  -- ==========================================
  -- UNIQUE constraint for upsert
  -- ==========================================
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submission_answers_submission_question_unique') THEN
    -- Remove duplicates first
    DELETE FROM submission_answers a USING submission_answers b
    WHERE a.id > b.id AND a.submission_id = b.submission_id AND a.question_id = b.question_id;

    ALTER TABLE submission_answers
    ADD CONSTRAINT submission_answers_submission_question_unique
    UNIQUE (submission_id, question_id);
    RAISE NOTICE 'Added unique constraint on submission_answers(submission_id, question_id)';
  END IF;

  RAISE NOTICE '✅ All submission columns ensured!';
END $$;


-- ========== 009_question_bank.sql ==========
-- Ngân hàng câu hỏi: metadata + đường dẫn file trên Supabase Storage (bucket cấu hình bởi QUESTION_BANK_BUCKET).
-- Tạo bucket "question-bank" (hoặc tên khác) trong Supabase Dashboard → Storage, bật public nếu dùng URL công khai.

CREATE TABLE IF NOT EXISTS question_bank_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT,
  question_text TEXT NOT NULL DEFAULT '',
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  options JSONB,
  correct_answer TEXT,
  points INTEGER NOT NULL DEFAULT 1,
  file_url TEXT,
  youtube_url TEXT,
  file_storage_path TEXT,
  audio_storage_path TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  skill TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_bank_skill ON question_bank_items(skill);
CREATE INDEX IF NOT EXISTS idx_question_bank_created ON question_bank_items(created_by);
CREATE INDEX IF NOT EXISTS idx_question_bank_created_at ON question_bank_items(created_at DESC);


-- ========== 010_assignment_questions_toeic_meta.sql ==========
-- Metadata TOEIC (Part, kỹ năng, timer speaking/writing, …) — JSON linh hoạt.
ALTER TABLE assignment_questions
  ADD COLUMN IF NOT EXISTS toeic_meta JSONB DEFAULT NULL;

COMMENT ON COLUMN assignment_questions.toeic_meta IS 'TOEIC: { skill, part, task_code, prep_seconds, answer_seconds, hide_options_text, … }';


-- ========== 011_assignments_toeic_types_check.sql ==========
-- Mở rộng CHECK cho assignments.assignment_type & assignment_questions.question_type (TOEIC).
-- Nếu ADD CONSTRAINT báo lỗi 23514: có dòng không khớp — script này chuẩn hóa dữ liệu trước.

-- (Tuỳ chọn) Xem giá trị đang có:
-- SELECT DISTINCT assignment_type FROM assignments;
-- SELECT DISTINCT question_type FROM assignment_questions;

-- 1) Gỡ CHECK cũ trên assignments.assignment_type
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'assignments'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%assignment_type%'
  ) LOOP
    EXECUTE format('ALTER TABLE assignments DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 2) Chuẩn hóa dữ liệu trước khi thêm CHECK mới
UPDATE assignments
SET assignment_type = 'mixed'
WHERE assignment_type IS NULL
   OR trim(assignment_type) = ''
   OR lower(trim(assignment_type)) NOT IN (
        'essay',
        'multiple_choice',
        'mixed',
        'toeic_listening',
        'toeic_lr',
        'toeic_four_skills'
      );

ALTER TABLE assignments ADD CONSTRAINT assignments_assignment_type_check CHECK (
  assignment_type IN (
    'essay',
    'multiple_choice',
    'mixed',
    'toeic_listening',
    'toeic_lr',
    'toeic_four_skills'
  )
);

-- 3) Gỡ CHECK cũ trên assignment_questions.question_type
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'assignment_questions'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%question_type%'
  ) LOOP
    EXECUTE format('ALTER TABLE assignment_questions DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 4) Chuẩn hóa câu hỏi — giá trị lạ → essay (an toàn cho tự luận)
UPDATE assignment_questions
SET question_type = 'essay'
WHERE question_type IS NULL
   OR trim(question_type) = ''
   OR lower(trim(question_type)) NOT IN (
        'essay',
        'multiple_choice',
        'toeic_speaking',
        'toeic_writing'
      );

ALTER TABLE assignment_questions ADD CONSTRAINT assignment_questions_question_type_check CHECK (
  question_type IN (
    'essay',
    'multiple_choice',
    'toeic_speaking',
    'toeic_writing'
  )
);


-- ========== 012_assignments_allow_retake.sql ==========
-- Cho phép học sinh làm lại bài (nhiều lần nộp). Chỉ giới hạn tối đa 1 bài trạng thái in_progress.

DROP INDEX IF EXISTS idx_submissions_student_assignment;

CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_student_assignment_in_progress
  ON submissions(assignment_id, student_id)
  WHERE (status = 'in_progress');

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS allow_retake BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN assignments.allow_retake IS 'Học sinh được làm lại sau khi đã nộp (lượt mới tạo submission mới)';


-- ========== 013_assignments_max_attempts.sql ==========
-- Giới hạn số lần nộp bài (tính mọi lượt). NULL hoặc 0 = không giới hạn khi allow_retake.

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NULL;

COMMENT ON COLUMN assignments.max_attempts IS 'Tối đa số lần nộp (mỗi lần nộp = 1 lượt). NULL hoặc 0 = không giới hạn nếu allow_retake.';


-- ========== 014_assignments_listening_exam_mode.sql ==========
-- Chế độ thi mô phỏng cho TOEIC Listening: audio tự phát, có khoảng chờ tích đáp án rồi tự chuyển câu.
-- Khi listening_exam_mode = true, học sinh không thể tua audio / quay lại câu trước (giống thi thật).

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS listening_exam_mode BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS listening_answer_seconds INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS listening_part34_answer_seconds INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS listening_directions_seconds INTEGER NOT NULL DEFAULT 25;

COMMENT ON COLUMN assignments.listening_exam_mode IS 'TOEIC Listening: bật chế độ thi mô phỏng (autoplay + auto-next + khoá tương tác).';
COMMENT ON COLUMN assignments.listening_answer_seconds IS 'Số giây chờ HS chọn đáp án sau mỗi audio Part 1/2 (mặc định 5s).';
COMMENT ON COLUMN assignments.listening_part34_answer_seconds IS 'Số giây chờ HS chọn đáp án giữa các câu thuộc 1 nhóm Part 3/4 (mặc định 8s).';
COMMENT ON COLUMN assignments.listening_directions_seconds IS 'Số giây hiển thị phần Directions ở đầu mỗi part (mặc định 25s).';


-- ========== 015_tuition.sql ==========
-- ========== 015_tuition.sql ==========
-- Tuition fee accounting: invoices, items, payments
-- Extends classes table with fee policy configuration

-- ----- 1. Extend classes with fee policy -----
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS fee_policy VARCHAR(20)
    CHECK (fee_policy IN ('per_class', 'monthly', 'per_session'));

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(12, 2) DEFAULT 0;

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS billing_day SMALLINT DEFAULT 1
    CHECK (billing_day BETWEEN 1 AND 28);

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS sessions_per_period SMALLINT DEFAULT 0;

-- ----- 2. tuition_invoices -----
CREATE TABLE IF NOT EXISTS tuition_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no VARCHAR(32) UNIQUE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  fee_policy VARCHAR(20) NOT NULL CHECK (fee_policy IN ('per_class', 'monthly', 'per_session')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'unpaid'
    CHECK (status IN ('unpaid', 'partial', 'paid', 'overdue', 'cancelled')),
  note TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (student_id, class_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_tuition_invoices_student ON tuition_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_tuition_invoices_class ON tuition_invoices(class_id);
CREATE INDEX IF NOT EXISTS idx_tuition_invoices_status ON tuition_invoices(status);
CREATE INDEX IF NOT EXISTS idx_tuition_invoices_period ON tuition_invoices(period_start, period_end);

-- Auto generate invoice_no like INV-202605-000001
CREATE SEQUENCE IF NOT EXISTS tuition_invoice_no_seq START 1;

CREATE OR REPLACE FUNCTION set_tuition_invoice_no() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_no IS NULL OR NEW.invoice_no = '' THEN
    NEW.invoice_no := 'INV-' || to_char(now(), 'YYYYMM') || '-' ||
                      lpad(nextval('tuition_invoice_no_seq')::text, 6, '0');
  END IF;
  NEW.balance := COALESCE(NEW.total, 0) - COALESCE(NEW.paid_amount, 0);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tuition_invoice_no ON tuition_invoices;
CREATE TRIGGER trg_tuition_invoice_no
  BEFORE INSERT OR UPDATE ON tuition_invoices
  FOR EACH ROW EXECUTE FUNCTION set_tuition_invoice_no();

-- ----- 3. tuition_invoice_items -----
CREATE TABLE IF NOT EXISTS tuition_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES tuition_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tuition_invoice_items_invoice ON tuition_invoice_items(invoice_id);

-- ----- 4. tuition_payments -----
CREATE TABLE IF NOT EXISTS tuition_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no VARCHAR(32) UNIQUE,
  invoice_id UUID NOT NULL REFERENCES tuition_invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(20) NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'other')),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  collected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  finance_id UUID REFERENCES finances(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tuition_payments_invoice ON tuition_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_tuition_payments_paid_at ON tuition_payments(paid_at);

CREATE SEQUENCE IF NOT EXISTS tuition_receipt_no_seq START 1;

CREATE OR REPLACE FUNCTION set_tuition_receipt_no() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receipt_no IS NULL OR NEW.receipt_no = '' THEN
    NEW.receipt_no := 'RC-' || to_char(now(), 'YYYYMM') || '-' ||
                      lpad(nextval('tuition_receipt_no_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tuition_receipt_no ON tuition_payments;
CREATE TRIGGER trg_tuition_receipt_no
  BEFORE INSERT ON tuition_payments
  FOR EACH ROW EXECUTE FUNCTION set_tuition_receipt_no();

-- ----- 5. Auto-update invoice paid_amount/status when payments change -----
CREATE OR REPLACE FUNCTION sync_invoice_from_payments() RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_total NUMERIC(12, 2);
  v_paid NUMERIC(12, 2);
  v_due DATE;
  v_status VARCHAR(20);
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  SELECT total, due_date INTO v_total, v_due
  FROM tuition_invoices WHERE id = v_invoice_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM tuition_payments WHERE invoice_id = v_invoice_id;

  IF v_paid >= v_total AND v_total > 0 THEN
    v_status := 'paid';
  ELSIF v_paid > 0 THEN
    v_status := 'partial';
  ELSIF v_due IS NOT NULL AND v_due < CURRENT_DATE THEN
    v_status := 'overdue';
  ELSE
    v_status := 'unpaid';
  END IF;

  UPDATE tuition_invoices
  SET paid_amount = v_paid,
      balance = COALESCE(total, 0) - v_paid,
      status = CASE WHEN status = 'cancelled' THEN 'cancelled' ELSE v_status END,
      updated_at = now()
  WHERE id = v_invoice_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_invoice_after_payment ON tuition_payments;
CREATE TRIGGER trg_sync_invoice_after_payment
  AFTER INSERT OR UPDATE OR DELETE ON tuition_payments
  FOR EACH ROW EXECUTE FUNCTION sync_invoice_from_payments();


-- ========== 016_tuition_transfer_image.sql ==========
-- ========== 016_tuition_transfer_image.sql ==========
-- Thêm cột lưu ảnh chuyển khoản (URL) cho tuition_payments

ALTER TABLE tuition_payments
  ADD COLUMN IF NOT EXISTS transfer_image_url TEXT;


-- ========== 017_tuition_invoice_attachments_and_periods.sql ==========
  -- ========== 017_tuition_invoice_attachments_and_periods.sql ==========
  -- Cho phép 1 hóa đơn:
  --   1) Đính kèm nhiều ảnh chứng từ
  --   2) Bao gồm nhiều dòng học phí thuộc nhiều tháng khác nhau (mỗi item có period riêng)

  ALTER TABLE tuition_invoices
    ADD COLUMN IF NOT EXISTS attachment_urls TEXT[] DEFAULT '{}';

  ALTER TABLE tuition_invoice_items
    ADD COLUMN IF NOT EXISTS period_start DATE,
    ADD COLUMN IF NOT EXISTS period_end DATE;

  CREATE INDEX IF NOT EXISTS idx_tuition_invoice_items_period
    ON tuition_invoice_items(period_start, period_end);


-- ========== 018_tuition_invoice_item_attachments.sql ==========
ALTER TABLE tuition_invoice_items
  ADD COLUMN IF NOT EXISTS attachment_urls TEXT[] DEFAULT '{}';


-- ========== 019_drop_tuition_invoice_period_unique.sql ==========
ALTER TABLE tuition_invoices
  DROP CONSTRAINT IF EXISTS tuition_invoices_student_id_class_id_period_start_key;


-- ========== 020_class_enrollment_date.sql ==========
ALTER TABLE class_students
  ADD COLUMN IF NOT EXISTS enrollment_date DATE;

UPDATE class_students SET enrollment_date = COALESCE(
  (enrolled_at AT TIME ZONE 'UTC')::date,
  CURRENT_DATE
) WHERE enrollment_date IS NULL;

ALTER TABLE class_students ALTER COLUMN enrollment_date SET DEFAULT CURRENT_DATE;

UPDATE class_students SET enrollment_date = CURRENT_DATE WHERE enrollment_date IS NULL;

ALTER TABLE class_students ALTER COLUMN enrollment_date SET NOT NULL;


-- ========== ALL_FIX_SUBMISSIONS.sql ==========
-- Run this in Supabase SQL Editor to fix all submission-related schema issues
-- Safe to run multiple times (idempotent)

DO $$
BEGIN
  -- ==========================================
  -- FIX submissions table
  -- ==========================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'auto_score') THEN
    ALTER TABLE submissions ADD COLUMN auto_score NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'manual_score') THEN
    ALTER TABLE submissions ADD COLUMN manual_score NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'total_points') THEN
    ALTER TABLE submissions ADD COLUMN total_points NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'started_at') THEN
    ALTER TABLE submissions ADD COLUMN started_at TIMESTAMPTZ DEFAULT now();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'time_spent_seconds') THEN
    ALTER TABLE submissions ADD COLUMN time_spent_seconds INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'updated_at') THEN
    ALTER TABLE submissions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;

  -- ==========================================
  -- FIX submission_answers table
  -- ==========================================

  -- Rename selected_option_id -> selected_option_index if old schema
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'selected_option_id') THEN
    ALTER TABLE submission_answers RENAME COLUMN selected_option_id TO selected_option_index;
    ALTER TABLE submission_answers ALTER COLUMN selected_option_index TYPE INTEGER USING selected_option_index::INTEGER;
  END IF;

  -- Add selected_option_index if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'selected_option_index') THEN
    ALTER TABLE submission_answers ADD COLUMN selected_option_index INTEGER;
  END IF;

  -- Add score column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'score') THEN
    ALTER TABLE submission_answers ADD COLUMN score NUMERIC(6,2);
  END IF;

  -- Rename points_earned -> score if old schema
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'points_earned')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'score') THEN
    ALTER TABLE submission_answers RENAME COLUMN points_earned TO score;
  END IF;

  -- Add feedback column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'feedback') THEN
    ALTER TABLE submission_answers ADD COLUMN feedback TEXT;
  END IF;

  -- Add updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'updated_at') THEN
    ALTER TABLE submission_answers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;

  -- ==========================================
  -- UNIQUE CONSTRAINT for upsert
  -- ==========================================
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submission_answers_submission_question_unique') THEN
    -- Delete duplicates first
    DELETE FROM submission_answers a USING submission_answers b
    WHERE a.id > b.id AND a.submission_id = b.submission_id AND a.question_id = b.question_id;

    ALTER TABLE submission_answers 
    ADD CONSTRAINT submission_answers_submission_question_unique 
    UNIQUE (submission_id, question_id);
  END IF;

  RAISE NOTICE 'All submission schema fixes applied successfully!';
END $$;


-- ========== _all_migrations.sql ==========
-- ========== 000_extensions.sql ==========
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ========== 001_enrollment_requests.sql ==========
-- ========== enrollment_requests ==========
-- Stores teacher requests to add students to classes, pending admin approval

CREATE TABLE IF NOT EXISTS enrollment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  note TEXT,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent duplicate pending requests for same student+class
  UNIQUE(class_id, student_id, status)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_status ON enrollment_requests(status);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_class ON enrollment_requests(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_requested_by ON enrollment_requests(requested_by);


-- ========== 002_template_permissions.sql ==========
-- ========== template_permissions ==========
-- Controls which templates teachers are allowed to use.
-- If a template has no rows here, only admin can use it.
-- If teacher_id is NULL, ALL teachers can use it.

CREATE TABLE IF NOT EXISTS template_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type VARCHAR(20) NOT NULL CHECK (template_type IN ('lesson', 'assignment')),
  template_id UUID NOT NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique: one permission per template+teacher combo (NULL teacher = all)
  UNIQUE(template_type, template_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_template_permissions_template ON template_permissions(template_type, template_id);
CREATE INDEX IF NOT EXISTS idx_template_permissions_teacher ON template_permissions(teacher_id);


-- ========== 003_schedules_date_range.sql ==========
-- ========== Add date range to schedules ==========
-- Schedules now have start_date and end_date to limit recurring display range.

ALTER TABLE schedules ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS end_date DATE;

CREATE INDEX IF NOT EXISTS idx_schedules_date_range ON schedules(start_date, end_date);


-- ========== 004_submissions.sql ==========
-- ========== submissions ==========
-- Stores student assignment submissions

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
  score NUMERIC(6,2),
  total_points NUMERIC(6,2),
  auto_score NUMERIC(6,2),
  manual_score NUMERIC(6,2),
  feedback TEXT,
  graded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  graded_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  time_spent_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One active submission per student per assignment
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_student_assignment
  ON submissions(assignment_id, student_id)
  WHERE status != 'in_progress';

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

-- ========== submission_answers ==========
-- Individual answers for each question in a submission

CREATE TABLE IF NOT EXISTS submission_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES assignment_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  selected_option_index INTEGER,
  is_correct BOOLEAN,
  score NUMERIC(6,2),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(submission_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_submission_answers_submission ON submission_answers(submission_id);


-- ========== 005_fix_submissions_schema.sql ==========
-- Fix: rename selected_option_id to selected_option_index (if old schema)
-- and change type from TEXT to INTEGER

DO $$
BEGIN
  -- If old column exists, rename and change type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submission_answers' AND column_name = 'selected_option_id'
  ) THEN
    ALTER TABLE submission_answers RENAME COLUMN selected_option_id TO selected_option_index;
    ALTER TABLE submission_answers ALTER COLUMN selected_option_index TYPE INTEGER USING selected_option_index::INTEGER;
    RAISE NOTICE 'Renamed selected_option_id -> selected_option_index (INTEGER)';
  END IF;

  -- If column doesn't exist at all, add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submission_answers' AND column_name = 'selected_option_index'
  ) THEN
    ALTER TABLE submission_answers ADD COLUMN selected_option_index INTEGER;
    RAISE NOTICE 'Added selected_option_index column';
  END IF;

  -- Ensure submissions has all needed columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'auto_score'
  ) THEN
    ALTER TABLE submissions ADD COLUMN auto_score NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'manual_score'
  ) THEN
    ALTER TABLE submissions ADD COLUMN manual_score NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'total_points'
  ) THEN
    ALTER TABLE submissions ADD COLUMN total_points NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE submissions ADD COLUMN started_at TIMESTAMPTZ DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'time_spent_seconds'
  ) THEN
    ALTER TABLE submissions ADD COLUMN time_spent_seconds INTEGER;
  END IF;

  -- Ensure submission_answers has score column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submission_answers' AND column_name = 'score'
  ) THEN
    ALTER TABLE submission_answers ADD COLUMN score NUMERIC(6,2);
  END IF;

  -- Ensure submission_answers has updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submission_answers' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE submission_answers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;

END $$;


-- ========== 006_fix_submission_answers_unique.sql ==========
-- Ensure unique constraint for submission_answers upsert
DO $$
BEGIN
  -- Add unique constraint on (submission_id, question_id) if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'submission_answers_submission_question_unique'
  ) THEN
    -- First delete duplicates if any
    DELETE FROM submission_answers a USING submission_answers b
    WHERE a.id > b.id 
    AND a.submission_id = b.submission_id 
    AND a.question_id = b.question_id;

    ALTER TABLE submission_answers 
    ADD CONSTRAINT submission_answers_submission_question_unique 
    UNIQUE (submission_id, question_id);
    
    RAISE NOTICE 'Added unique constraint on submission_answers(submission_id, question_id)';
  END IF;
END $$;


-- ========== 007_ensure_submission_columns.sql ==========
-- Ensure all submission-related columns exist (safe to run multiple times)
-- Run this in Supabase SQL Editor if you get 500 errors on submit

DO $$
BEGIN
  -- ==========================================
  -- submissions table columns
  -- ==========================================
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'auto_score') THEN
    ALTER TABLE submissions ADD COLUMN auto_score NUMERIC(6,2);
    RAISE NOTICE 'Added submissions.auto_score';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'manual_score') THEN
    ALTER TABLE submissions ADD COLUMN manual_score NUMERIC(6,2);
    RAISE NOTICE 'Added submissions.manual_score';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'total_points') THEN
    ALTER TABLE submissions ADD COLUMN total_points NUMERIC(6,2);
    RAISE NOTICE 'Added submissions.total_points';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'started_at') THEN
    ALTER TABLE submissions ADD COLUMN started_at TIMESTAMPTZ DEFAULT now();
    RAISE NOTICE 'Added submissions.started_at';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'time_spent_seconds') THEN
    ALTER TABLE submissions ADD COLUMN time_spent_seconds INTEGER;
    RAISE NOTICE 'Added submissions.time_spent_seconds';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'updated_at') THEN
    ALTER TABLE submissions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    RAISE NOTICE 'Added submissions.updated_at';
  END IF;

  -- ==========================================
  -- submission_answers table columns
  -- ==========================================
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'selected_option_index') THEN
    ALTER TABLE submission_answers ADD COLUMN selected_option_index INTEGER;
    RAISE NOTICE 'Added submission_answers.selected_option_index';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'score') THEN
    ALTER TABLE submission_answers ADD COLUMN score NUMERIC(6,2);
    RAISE NOTICE 'Added submission_answers.score';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'feedback') THEN
    ALTER TABLE submission_answers ADD COLUMN feedback TEXT;
    RAISE NOTICE 'Added submission_answers.feedback';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'updated_at') THEN
    ALTER TABLE submission_answers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    RAISE NOTICE 'Added submission_answers.updated_at';
  END IF;

  -- ==========================================
  -- UNIQUE constraint for upsert
  -- ==========================================
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submission_answers_submission_question_unique') THEN
    -- Remove duplicates first
    DELETE FROM submission_answers a USING submission_answers b
    WHERE a.id > b.id AND a.submission_id = b.submission_id AND a.question_id = b.question_id;

    ALTER TABLE submission_answers
    ADD CONSTRAINT submission_answers_submission_question_unique
    UNIQUE (submission_id, question_id);
    RAISE NOTICE 'Added unique constraint on submission_answers(submission_id, question_id)';
  END IF;

  RAISE NOTICE '✅ All submission columns ensured!';
END $$;


-- ========== 009_question_bank.sql ==========
-- Ngân hàng câu hỏi: metadata + đường dẫn file trên Supabase Storage (bucket cấu hình bởi QUESTION_BANK_BUCKET).
-- Tạo bucket "question-bank" (hoặc tên khác) trong Supabase Dashboard → Storage, bật public nếu dùng URL công khai.

CREATE TABLE IF NOT EXISTS question_bank_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT,
  question_text TEXT NOT NULL DEFAULT '',
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  options JSONB,
  correct_answer TEXT,
  points INTEGER NOT NULL DEFAULT 1,
  file_url TEXT,
  youtube_url TEXT,
  file_storage_path TEXT,
  audio_storage_path TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  skill TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_bank_skill ON question_bank_items(skill);
CREATE INDEX IF NOT EXISTS idx_question_bank_created ON question_bank_items(created_by);
CREATE INDEX IF NOT EXISTS idx_question_bank_created_at ON question_bank_items(created_at DESC);


-- ========== 010_assignment_questions_toeic_meta.sql ==========
-- Metadata TOEIC (Part, kỹ năng, timer speaking/writing, …) — JSON linh hoạt.
ALTER TABLE assignment_questions
  ADD COLUMN IF NOT EXISTS toeic_meta JSONB DEFAULT NULL;

COMMENT ON COLUMN assignment_questions.toeic_meta IS 'TOEIC: { skill, part, task_code, prep_seconds, answer_seconds, hide_options_text, … }';


-- ========== 011_assignments_toeic_types_check.sql ==========
-- Mở rộng CHECK cho assignments.assignment_type & assignment_questions.question_type (TOEIC).
-- Nếu ADD CONSTRAINT báo lỗi 23514: có dòng không khớp — script này chuẩn hóa dữ liệu trước.

-- (Tuỳ chọn) Xem giá trị đang có:
-- SELECT DISTINCT assignment_type FROM assignments;
-- SELECT DISTINCT question_type FROM assignment_questions;

-- 1) Gỡ CHECK cũ trên assignments.assignment_type
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'assignments'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%assignment_type%'
  ) LOOP
    EXECUTE format('ALTER TABLE assignments DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 2) Chuẩn hóa dữ liệu trước khi thêm CHECK mới
UPDATE assignments
SET assignment_type = 'mixed'
WHERE assignment_type IS NULL
   OR trim(assignment_type) = ''
   OR lower(trim(assignment_type)) NOT IN (
        'essay',
        'multiple_choice',
        'mixed',
        'toeic_listening',
        'toeic_lr',
        'toeic_four_skills'
      );

ALTER TABLE assignments ADD CONSTRAINT assignments_assignment_type_check CHECK (
  assignment_type IN (
    'essay',
    'multiple_choice',
    'mixed',
    'toeic_listening',
    'toeic_lr',
    'toeic_four_skills'
  )
);

-- 3) Gỡ CHECK cũ trên assignment_questions.question_type
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'assignment_questions'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%question_type%'
  ) LOOP
    EXECUTE format('ALTER TABLE assignment_questions DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 4) Chuẩn hóa câu hỏi — giá trị lạ → essay (an toàn cho tự luận)
UPDATE assignment_questions
SET question_type = 'essay'
WHERE question_type IS NULL
   OR trim(question_type) = ''
   OR lower(trim(question_type)) NOT IN (
        'essay',
        'multiple_choice',
        'toeic_speaking',
        'toeic_writing'
      );

ALTER TABLE assignment_questions ADD CONSTRAINT assignment_questions_question_type_check CHECK (
  question_type IN (
    'essay',
    'multiple_choice',
    'toeic_speaking',
    'toeic_writing'
  )
);


-- ========== 012_assignments_allow_retake.sql ==========
-- Cho phép học sinh làm lại bài (nhiều lần nộp). Chỉ giới hạn tối đa 1 bài trạng thái in_progress.

DROP INDEX IF EXISTS idx_submissions_student_assignment;

CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_student_assignment_in_progress
  ON submissions(assignment_id, student_id)
  WHERE (status = 'in_progress');

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS allow_retake BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN assignments.allow_retake IS 'Học sinh được làm lại sau khi đã nộp (lượt mới tạo submission mới)';


-- ========== 013_assignments_max_attempts.sql ==========
-- Giới hạn số lần nộp bài (tính mọi lượt). NULL hoặc 0 = không giới hạn khi allow_retake.

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NULL;

COMMENT ON COLUMN assignments.max_attempts IS 'Tối đa số lần nộp (mỗi lần nộp = 1 lượt). NULL hoặc 0 = không giới hạn nếu allow_retake.';


-- ========== 014_assignments_listening_exam_mode.sql ==========
-- Chế độ thi mô phỏng cho TOEIC Listening: audio tự phát, có khoảng chờ tích đáp án rồi tự chuyển câu.
-- Khi listening_exam_mode = true, học sinh không thể tua audio / quay lại câu trước (giống thi thật).

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS listening_exam_mode BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS listening_answer_seconds INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS listening_part34_answer_seconds INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS listening_directions_seconds INTEGER NOT NULL DEFAULT 25;

COMMENT ON COLUMN assignments.listening_exam_mode IS 'TOEIC Listening: bật chế độ thi mô phỏng (autoplay + auto-next + khoá tương tác).';
COMMENT ON COLUMN assignments.listening_answer_seconds IS 'Số giây chờ HS chọn đáp án sau mỗi audio Part 1/2 (mặc định 5s).';
COMMENT ON COLUMN assignments.listening_part34_answer_seconds IS 'Số giây chờ HS chọn đáp án giữa các câu thuộc 1 nhóm Part 3/4 (mặc định 8s).';
COMMENT ON COLUMN assignments.listening_directions_seconds IS 'Số giây hiển thị phần Directions ở đầu mỗi part (mặc định 25s).';


-- ========== 015_tuition.sql ==========
-- ========== 015_tuition.sql ==========
-- Tuition fee accounting: invoices, items, payments
-- Extends classes table with fee policy configuration

-- ----- 1. Extend classes with fee policy -----
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS fee_policy VARCHAR(20)
    CHECK (fee_policy IN ('per_class', 'monthly', 'per_session'));

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(12, 2) DEFAULT 0;

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS billing_day SMALLINT DEFAULT 1
    CHECK (billing_day BETWEEN 1 AND 28);

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS sessions_per_period SMALLINT DEFAULT 0;

-- ----- 2. tuition_invoices -----
CREATE TABLE IF NOT EXISTS tuition_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no VARCHAR(32) UNIQUE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  fee_policy VARCHAR(20) NOT NULL CHECK (fee_policy IN ('per_class', 'monthly', 'per_session')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'unpaid'
    CHECK (status IN ('unpaid', 'partial', 'paid', 'overdue', 'cancelled')),
  note TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (student_id, class_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_tuition_invoices_student ON tuition_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_tuition_invoices_class ON tuition_invoices(class_id);
CREATE INDEX IF NOT EXISTS idx_tuition_invoices_status ON tuition_invoices(status);
CREATE INDEX IF NOT EXISTS idx_tuition_invoices_period ON tuition_invoices(period_start, period_end);

-- Auto generate invoice_no like INV-202605-000001
CREATE SEQUENCE IF NOT EXISTS tuition_invoice_no_seq START 1;

CREATE OR REPLACE FUNCTION set_tuition_invoice_no() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_no IS NULL OR NEW.invoice_no = '' THEN
    NEW.invoice_no := 'INV-' || to_char(now(), 'YYYYMM') || '-' ||
                      lpad(nextval('tuition_invoice_no_seq')::text, 6, '0');
  END IF;
  NEW.balance := COALESCE(NEW.total, 0) - COALESCE(NEW.paid_amount, 0);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tuition_invoice_no ON tuition_invoices;
CREATE TRIGGER trg_tuition_invoice_no
  BEFORE INSERT OR UPDATE ON tuition_invoices
  FOR EACH ROW EXECUTE FUNCTION set_tuition_invoice_no();

-- ----- 3. tuition_invoice_items -----
CREATE TABLE IF NOT EXISTS tuition_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES tuition_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tuition_invoice_items_invoice ON tuition_invoice_items(invoice_id);

-- ----- 4. tuition_payments -----
CREATE TABLE IF NOT EXISTS tuition_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no VARCHAR(32) UNIQUE,
  invoice_id UUID NOT NULL REFERENCES tuition_invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(20) NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'other')),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  collected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  finance_id UUID REFERENCES finances(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tuition_payments_invoice ON tuition_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_tuition_payments_paid_at ON tuition_payments(paid_at);

CREATE SEQUENCE IF NOT EXISTS tuition_receipt_no_seq START 1;

CREATE OR REPLACE FUNCTION set_tuition_receipt_no() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receipt_no IS NULL OR NEW.receipt_no = '' THEN
    NEW.receipt_no := 'RC-' || to_char(now(), 'YYYYMM') || '-' ||
                      lpad(nextval('tuition_receipt_no_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tuition_receipt_no ON tuition_payments;
CREATE TRIGGER trg_tuition_receipt_no
  BEFORE INSERT ON tuition_payments
  FOR EACH ROW EXECUTE FUNCTION set_tuition_receipt_no();

-- ----- 5. Auto-update invoice paid_amount/status when payments change -----
CREATE OR REPLACE FUNCTION sync_invoice_from_payments() RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_total NUMERIC(12, 2);
  v_paid NUMERIC(12, 2);
  v_due DATE;
  v_status VARCHAR(20);
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  SELECT total, due_date INTO v_total, v_due
  FROM tuition_invoices WHERE id = v_invoice_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM tuition_payments WHERE invoice_id = v_invoice_id;

  IF v_paid >= v_total AND v_total > 0 THEN
    v_status := 'paid';
  ELSIF v_paid > 0 THEN
    v_status := 'partial';
  ELSIF v_due IS NOT NULL AND v_due < CURRENT_DATE THEN
    v_status := 'overdue';
  ELSE
    v_status := 'unpaid';
  END IF;

  UPDATE tuition_invoices
  SET paid_amount = v_paid,
      balance = COALESCE(total, 0) - v_paid,
      status = CASE WHEN status = 'cancelled' THEN 'cancelled' ELSE v_status END,
      updated_at = now()
  WHERE id = v_invoice_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_invoice_after_payment ON tuition_payments;
CREATE TRIGGER trg_sync_invoice_after_payment
  AFTER INSERT OR UPDATE OR DELETE ON tuition_payments
  FOR EACH ROW EXECUTE FUNCTION sync_invoice_from_payments();


-- ========== 016_tuition_transfer_image.sql ==========
-- ========== 016_tuition_transfer_image.sql ==========
-- Thêm cột lưu ảnh chuyển khoản (URL) cho tuition_payments

ALTER TABLE tuition_payments
  ADD COLUMN IF NOT EXISTS transfer_image_url TEXT;


-- ========== 017_tuition_invoice_attachments_and_periods.sql ==========
-- ========== 017_tuition_invoice_attachments_and_periods.sql ==========
-- Cho phép 1 hóa đơn:
--   1) Đính kèm nhiều ảnh chứng từ
--   2) Bao gồm nhiều dòng học phí thuộc nhiều tháng khác nhau (mỗi item có period riêng)

ALTER TABLE tuition_invoices
  ADD COLUMN IF NOT EXISTS attachment_urls TEXT[] DEFAULT '{}';

ALTER TABLE tuition_invoice_items
  ADD COLUMN IF NOT EXISTS period_start DATE,
  ADD COLUMN IF NOT EXISTS period_end DATE;

CREATE INDEX IF NOT EXISTS idx_tuition_invoice_items_period
  ON tuition_invoice_items(period_start, period_end);


-- ========== ALL_FIX_SUBMISSIONS.sql ==========
-- Run this in Supabase SQL Editor to fix all submission-related schema issues
-- Safe to run multiple times (idempotent)

DO $$
BEGIN
  -- ==========================================
  -- FIX submissions table
  -- ==========================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'auto_score') THEN
    ALTER TABLE submissions ADD COLUMN auto_score NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'manual_score') THEN
    ALTER TABLE submissions ADD COLUMN manual_score NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'total_points') THEN
    ALTER TABLE submissions ADD COLUMN total_points NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'started_at') THEN
    ALTER TABLE submissions ADD COLUMN started_at TIMESTAMPTZ DEFAULT now();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'time_spent_seconds') THEN
    ALTER TABLE submissions ADD COLUMN time_spent_seconds INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'updated_at') THEN
    ALTER TABLE submissions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;

  -- ==========================================
  -- FIX submission_answers table
  -- ==========================================

  -- Rename selected_option_id -> selected_option_index if old schema
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'selected_option_id') THEN
    ALTER TABLE submission_answers RENAME COLUMN selected_option_id TO selected_option_index;
    ALTER TABLE submission_answers ALTER COLUMN selected_option_index TYPE INTEGER USING selected_option_index::INTEGER;
  END IF;

  -- Add selected_option_index if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'selected_option_index') THEN
    ALTER TABLE submission_answers ADD COLUMN selected_option_index INTEGER;
  END IF;

  -- Add score column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'score') THEN
    ALTER TABLE submission_answers ADD COLUMN score NUMERIC(6,2);
  END IF;

  -- Rename points_earned -> score if old schema
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'points_earned')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'score') THEN
    ALTER TABLE submission_answers RENAME COLUMN points_earned TO score;
  END IF;

  -- Add feedback column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'feedback') THEN
    ALTER TABLE submission_answers ADD COLUMN feedback TEXT;
  END IF;

  -- Add updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'updated_at') THEN
    ALTER TABLE submission_answers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;

  -- ==========================================
  -- UNIQUE CONSTRAINT for upsert
  -- ==========================================
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submission_answers_submission_question_unique') THEN
    -- Delete duplicates first
    DELETE FROM submission_answers a USING submission_answers b
    WHERE a.id > b.id AND a.submission_id = b.submission_id AND a.question_id = b.question_id;

    ALTER TABLE submission_answers 
    ADD CONSTRAINT submission_answers_submission_question_unique 
    UNIQUE (submission_id, question_id);
  END IF;

  RAISE NOTICE 'All submission schema fixes applied successfully!';
END $$;


-- ========== _all_migrations.sql ==========
-- ========== 000_extensions.sql ==========
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ========== 001_enrollment_requests.sql ==========
-- ========== enrollment_requests ==========
-- Stores teacher requests to add students to classes, pending admin approval

CREATE TABLE IF NOT EXISTS enrollment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  note TEXT,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent duplicate pending requests for same student+class
  UNIQUE(class_id, student_id, status)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_status ON enrollment_requests(status);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_class ON enrollment_requests(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_requested_by ON enrollment_requests(requested_by);


-- ========== 002_template_permissions.sql ==========
-- ========== template_permissions ==========
-- Controls which templates teachers are allowed to use.
-- If a template has no rows here, only admin can use it.
-- If teacher_id is NULL, ALL teachers can use it.

CREATE TABLE IF NOT EXISTS template_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type VARCHAR(20) NOT NULL CHECK (template_type IN ('lesson', 'assignment')),
  template_id UUID NOT NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique: one permission per template+teacher combo (NULL teacher = all)
  UNIQUE(template_type, template_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_template_permissions_template ON template_permissions(template_type, template_id);
CREATE INDEX IF NOT EXISTS idx_template_permissions_teacher ON template_permissions(teacher_id);


-- ========== 003_schedules_date_range.sql ==========
-- ========== Add date range to schedules ==========
-- Schedules now have start_date and end_date to limit recurring display range.

ALTER TABLE schedules ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS end_date DATE;

CREATE INDEX IF NOT EXISTS idx_schedules_date_range ON schedules(start_date, end_date);


-- ========== 004_submissions.sql ==========
-- ========== submissions ==========
-- Stores student assignment submissions

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
  score NUMERIC(6,2),
  total_points NUMERIC(6,2),
  auto_score NUMERIC(6,2),
  manual_score NUMERIC(6,2),
  feedback TEXT,
  graded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  graded_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  time_spent_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One active submission per student per assignment
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_student_assignment
  ON submissions(assignment_id, student_id)
  WHERE status != 'in_progress';

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

-- ========== submission_answers ==========
-- Individual answers for each question in a submission

CREATE TABLE IF NOT EXISTS submission_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES assignment_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  selected_option_index INTEGER,
  is_correct BOOLEAN,
  score NUMERIC(6,2),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(submission_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_submission_answers_submission ON submission_answers(submission_id);


-- ========== 005_fix_submissions_schema.sql ==========
-- Fix: rename selected_option_id to selected_option_index (if old schema)
-- and change type from TEXT to INTEGER

DO $$
BEGIN
  -- If old column exists, rename and change type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submission_answers' AND column_name = 'selected_option_id'
  ) THEN
    ALTER TABLE submission_answers RENAME COLUMN selected_option_id TO selected_option_index;
    ALTER TABLE submission_answers ALTER COLUMN selected_option_index TYPE INTEGER USING selected_option_index::INTEGER;
    RAISE NOTICE 'Renamed selected_option_id -> selected_option_index (INTEGER)';
  END IF;

  -- If column doesn't exist at all, add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submission_answers' AND column_name = 'selected_option_index'
  ) THEN
    ALTER TABLE submission_answers ADD COLUMN selected_option_index INTEGER;
    RAISE NOTICE 'Added selected_option_index column';
  END IF;

  -- Ensure submissions has all needed columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'auto_score'
  ) THEN
    ALTER TABLE submissions ADD COLUMN auto_score NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'manual_score'
  ) THEN
    ALTER TABLE submissions ADD COLUMN manual_score NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'total_points'
  ) THEN
    ALTER TABLE submissions ADD COLUMN total_points NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE submissions ADD COLUMN started_at TIMESTAMPTZ DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'time_spent_seconds'
  ) THEN
    ALTER TABLE submissions ADD COLUMN time_spent_seconds INTEGER;
  END IF;

  -- Ensure submission_answers has score column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submission_answers' AND column_name = 'score'
  ) THEN
    ALTER TABLE submission_answers ADD COLUMN score NUMERIC(6,2);
  END IF;

  -- Ensure submission_answers has updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submission_answers' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE submission_answers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;

END $$;


-- ========== 006_fix_submission_answers_unique.sql ==========
-- Ensure unique constraint for submission_answers upsert
DO $$
BEGIN
  -- Add unique constraint on (submission_id, question_id) if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'submission_answers_submission_question_unique'
  ) THEN
    -- First delete duplicates if any
    DELETE FROM submission_answers a USING submission_answers b
    WHERE a.id > b.id 
    AND a.submission_id = b.submission_id 
    AND a.question_id = b.question_id;

    ALTER TABLE submission_answers 
    ADD CONSTRAINT submission_answers_submission_question_unique 
    UNIQUE (submission_id, question_id);
    
    RAISE NOTICE 'Added unique constraint on submission_answers(submission_id, question_id)';
  END IF;
END $$;


-- ========== 007_ensure_submission_columns.sql ==========
-- Ensure all submission-related columns exist (safe to run multiple times)
-- Run this in Supabase SQL Editor if you get 500 errors on submit

DO $$
BEGIN
  -- ==========================================
  -- submissions table columns
  -- ==========================================
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'auto_score') THEN
    ALTER TABLE submissions ADD COLUMN auto_score NUMERIC(6,2);
    RAISE NOTICE 'Added submissions.auto_score';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'manual_score') THEN
    ALTER TABLE submissions ADD COLUMN manual_score NUMERIC(6,2);
    RAISE NOTICE 'Added submissions.manual_score';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'total_points') THEN
    ALTER TABLE submissions ADD COLUMN total_points NUMERIC(6,2);
    RAISE NOTICE 'Added submissions.total_points';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'started_at') THEN
    ALTER TABLE submissions ADD COLUMN started_at TIMESTAMPTZ DEFAULT now();
    RAISE NOTICE 'Added submissions.started_at';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'time_spent_seconds') THEN
    ALTER TABLE submissions ADD COLUMN time_spent_seconds INTEGER;
    RAISE NOTICE 'Added submissions.time_spent_seconds';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'updated_at') THEN
    ALTER TABLE submissions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    RAISE NOTICE 'Added submissions.updated_at';
  END IF;

  -- ==========================================
  -- submission_answers table columns
  -- ==========================================
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'selected_option_index') THEN
    ALTER TABLE submission_answers ADD COLUMN selected_option_index INTEGER;
    RAISE NOTICE 'Added submission_answers.selected_option_index';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'score') THEN
    ALTER TABLE submission_answers ADD COLUMN score NUMERIC(6,2);
    RAISE NOTICE 'Added submission_answers.score';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'feedback') THEN
    ALTER TABLE submission_answers ADD COLUMN feedback TEXT;
    RAISE NOTICE 'Added submission_answers.feedback';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'updated_at') THEN
    ALTER TABLE submission_answers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    RAISE NOTICE 'Added submission_answers.updated_at';
  END IF;

  -- ==========================================
  -- UNIQUE constraint for upsert
  -- ==========================================
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submission_answers_submission_question_unique') THEN
    -- Remove duplicates first
    DELETE FROM submission_answers a USING submission_answers b
    WHERE a.id > b.id AND a.submission_id = b.submission_id AND a.question_id = b.question_id;

    ALTER TABLE submission_answers
    ADD CONSTRAINT submission_answers_submission_question_unique
    UNIQUE (submission_id, question_id);
    RAISE NOTICE 'Added unique constraint on submission_answers(submission_id, question_id)';
  END IF;

  RAISE NOTICE '✅ All submission columns ensured!';
END $$;


-- ========== 009_question_bank.sql ==========
-- Ngân hàng câu hỏi: metadata + đường dẫn file trên Supabase Storage (bucket cấu hình bởi QUESTION_BANK_BUCKET).
-- Tạo bucket "question-bank" (hoặc tên khác) trong Supabase Dashboard → Storage, bật public nếu dùng URL công khai.

CREATE TABLE IF NOT EXISTS question_bank_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT,
  question_text TEXT NOT NULL DEFAULT '',
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  options JSONB,
  correct_answer TEXT,
  points INTEGER NOT NULL DEFAULT 1,
  file_url TEXT,
  youtube_url TEXT,
  file_storage_path TEXT,
  audio_storage_path TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  skill TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_bank_skill ON question_bank_items(skill);
CREATE INDEX IF NOT EXISTS idx_question_bank_created ON question_bank_items(created_by);
CREATE INDEX IF NOT EXISTS idx_question_bank_created_at ON question_bank_items(created_at DESC);


-- ========== 010_assignment_questions_toeic_meta.sql ==========
-- Metadata TOEIC (Part, kỹ năng, timer speaking/writing, …) — JSON linh hoạt.
ALTER TABLE assignment_questions
  ADD COLUMN IF NOT EXISTS toeic_meta JSONB DEFAULT NULL;

COMMENT ON COLUMN assignment_questions.toeic_meta IS 'TOEIC: { skill, part, task_code, prep_seconds, answer_seconds, hide_options_text, … }';


-- ========== 011_assignments_toeic_types_check.sql ==========
-- Mở rộng CHECK cho assignments.assignment_type & assignment_questions.question_type (TOEIC).
-- Nếu ADD CONSTRAINT báo lỗi 23514: có dòng không khớp — script này chuẩn hóa dữ liệu trước.

-- (Tuỳ chọn) Xem giá trị đang có:
-- SELECT DISTINCT assignment_type FROM assignments;
-- SELECT DISTINCT question_type FROM assignment_questions;

-- 1) Gỡ CHECK cũ trên assignments.assignment_type
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'assignments'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%assignment_type%'
  ) LOOP
    EXECUTE format('ALTER TABLE assignments DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 2) Chuẩn hóa dữ liệu trước khi thêm CHECK mới
UPDATE assignments
SET assignment_type = 'mixed'
WHERE assignment_type IS NULL
   OR trim(assignment_type) = ''
   OR lower(trim(assignment_type)) NOT IN (
        'essay',
        'multiple_choice',
        'mixed',
        'toeic_listening',
        'toeic_lr',
        'toeic_four_skills'
      );

ALTER TABLE assignments ADD CONSTRAINT assignments_assignment_type_check CHECK (
  assignment_type IN (
    'essay',
    'multiple_choice',
    'mixed',
    'toeic_listening',
    'toeic_lr',
    'toeic_four_skills'
  )
);

-- 3) Gỡ CHECK cũ trên assignment_questions.question_type
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'assignment_questions'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%question_type%'
  ) LOOP
    EXECUTE format('ALTER TABLE assignment_questions DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 4) Chuẩn hóa câu hỏi — giá trị lạ → essay (an toàn cho tự luận)
UPDATE assignment_questions
SET question_type = 'essay'
WHERE question_type IS NULL
   OR trim(question_type) = ''
   OR lower(trim(question_type)) NOT IN (
        'essay',
        'multiple_choice',
        'toeic_speaking',
        'toeic_writing'
      );

ALTER TABLE assignment_questions ADD CONSTRAINT assignment_questions_question_type_check CHECK (
  question_type IN (
    'essay',
    'multiple_choice',
    'toeic_speaking',
    'toeic_writing'
  )
);


-- ========== 012_assignments_allow_retake.sql ==========
-- Cho phép học sinh làm lại bài (nhiều lần nộp). Chỉ giới hạn tối đa 1 bài trạng thái in_progress.

DROP INDEX IF EXISTS idx_submissions_student_assignment;

CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_student_assignment_in_progress
  ON submissions(assignment_id, student_id)
  WHERE (status = 'in_progress');

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS allow_retake BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN assignments.allow_retake IS 'Học sinh được làm lại sau khi đã nộp (lượt mới tạo submission mới)';


-- ========== 013_assignments_max_attempts.sql ==========
-- Giới hạn số lần nộp bài (tính mọi lượt). NULL hoặc 0 = không giới hạn khi allow_retake.

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NULL;

COMMENT ON COLUMN assignments.max_attempts IS 'Tối đa số lần nộp (mỗi lần nộp = 1 lượt). NULL hoặc 0 = không giới hạn nếu allow_retake.';


-- ========== 014_assignments_listening_exam_mode.sql ==========
-- Chế độ thi mô phỏng cho TOEIC Listening: audio tự phát, có khoảng chờ tích đáp án rồi tự chuyển câu.
-- Khi listening_exam_mode = true, học sinh không thể tua audio / quay lại câu trước (giống thi thật).

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS listening_exam_mode BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS listening_answer_seconds INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS listening_part34_answer_seconds INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS listening_directions_seconds INTEGER NOT NULL DEFAULT 25;

COMMENT ON COLUMN assignments.listening_exam_mode IS 'TOEIC Listening: bật chế độ thi mô phỏng (autoplay + auto-next + khoá tương tác).';
COMMENT ON COLUMN assignments.listening_answer_seconds IS 'Số giây chờ HS chọn đáp án sau mỗi audio Part 1/2 (mặc định 5s).';
COMMENT ON COLUMN assignments.listening_part34_answer_seconds IS 'Số giây chờ HS chọn đáp án giữa các câu thuộc 1 nhóm Part 3/4 (mặc định 8s).';
COMMENT ON COLUMN assignments.listening_directions_seconds IS 'Số giây hiển thị phần Directions ở đầu mỗi part (mặc định 25s).';


-- ========== 015_tuition.sql ==========
-- ========== 015_tuition.sql ==========
-- Tuition fee accounting: invoices, items, payments
-- Extends classes table with fee policy configuration

-- ----- 1. Extend classes with fee policy -----
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS fee_policy VARCHAR(20)
    CHECK (fee_policy IN ('per_class', 'monthly', 'per_session'));

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(12, 2) DEFAULT 0;

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS billing_day SMALLINT DEFAULT 1
    CHECK (billing_day BETWEEN 1 AND 28);

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS sessions_per_period SMALLINT DEFAULT 0;

-- ----- 2. tuition_invoices -----
CREATE TABLE IF NOT EXISTS tuition_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no VARCHAR(32) UNIQUE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  fee_policy VARCHAR(20) NOT NULL CHECK (fee_policy IN ('per_class', 'monthly', 'per_session')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'unpaid'
    CHECK (status IN ('unpaid', 'partial', 'paid', 'overdue', 'cancelled')),
  note TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (student_id, class_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_tuition_invoices_student ON tuition_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_tuition_invoices_class ON tuition_invoices(class_id);
CREATE INDEX IF NOT EXISTS idx_tuition_invoices_status ON tuition_invoices(status);
CREATE INDEX IF NOT EXISTS idx_tuition_invoices_period ON tuition_invoices(period_start, period_end);

-- Auto generate invoice_no like INV-202605-000001
CREATE SEQUENCE IF NOT EXISTS tuition_invoice_no_seq START 1;

CREATE OR REPLACE FUNCTION set_tuition_invoice_no() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_no IS NULL OR NEW.invoice_no = '' THEN
    NEW.invoice_no := 'INV-' || to_char(now(), 'YYYYMM') || '-' ||
                      lpad(nextval('tuition_invoice_no_seq')::text, 6, '0');
  END IF;
  NEW.balance := COALESCE(NEW.total, 0) - COALESCE(NEW.paid_amount, 0);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tuition_invoice_no ON tuition_invoices;
CREATE TRIGGER trg_tuition_invoice_no
  BEFORE INSERT OR UPDATE ON tuition_invoices
  FOR EACH ROW EXECUTE FUNCTION set_tuition_invoice_no();

-- ----- 3. tuition_invoice_items -----
CREATE TABLE IF NOT EXISTS tuition_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES tuition_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tuition_invoice_items_invoice ON tuition_invoice_items(invoice_id);

-- ----- 4. tuition_payments -----
CREATE TABLE IF NOT EXISTS tuition_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no VARCHAR(32) UNIQUE,
  invoice_id UUID NOT NULL REFERENCES tuition_invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(20) NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'other')),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  collected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  finance_id UUID REFERENCES finances(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tuition_payments_invoice ON tuition_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_tuition_payments_paid_at ON tuition_payments(paid_at);

CREATE SEQUENCE IF NOT EXISTS tuition_receipt_no_seq START 1;

CREATE OR REPLACE FUNCTION set_tuition_receipt_no() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receipt_no IS NULL OR NEW.receipt_no = '' THEN
    NEW.receipt_no := 'RC-' || to_char(now(), 'YYYYMM') || '-' ||
                      lpad(nextval('tuition_receipt_no_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tuition_receipt_no ON tuition_payments;
CREATE TRIGGER trg_tuition_receipt_no
  BEFORE INSERT ON tuition_payments
  FOR EACH ROW EXECUTE FUNCTION set_tuition_receipt_no();

-- ----- 5. Auto-update invoice paid_amount/status when payments change -----
CREATE OR REPLACE FUNCTION sync_invoice_from_payments() RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_total NUMERIC(12, 2);
  v_paid NUMERIC(12, 2);
  v_due DATE;
  v_status VARCHAR(20);
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  SELECT total, due_date INTO v_total, v_due
  FROM tuition_invoices WHERE id = v_invoice_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM tuition_payments WHERE invoice_id = v_invoice_id;

  IF v_paid >= v_total AND v_total > 0 THEN
    v_status := 'paid';
  ELSIF v_paid > 0 THEN
    v_status := 'partial';
  ELSIF v_due IS NOT NULL AND v_due < CURRENT_DATE THEN
    v_status := 'overdue';
  ELSE
    v_status := 'unpaid';
  END IF;

  UPDATE tuition_invoices
  SET paid_amount = v_paid,
      balance = COALESCE(total, 0) - v_paid,
      status = CASE WHEN status = 'cancelled' THEN 'cancelled' ELSE v_status END,
      updated_at = now()
  WHERE id = v_invoice_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_invoice_after_payment ON tuition_payments;
CREATE TRIGGER trg_sync_invoice_after_payment
  AFTER INSERT OR UPDATE OR DELETE ON tuition_payments
  FOR EACH ROW EXECUTE FUNCTION sync_invoice_from_payments();


-- ========== 016_tuition_transfer_image.sql ==========
-- ========== 016_tuition_transfer_image.sql ==========
-- Thêm cột lưu ảnh chuyển khoản (URL) cho tuition_payments

ALTER TABLE tuition_payments
  ADD COLUMN IF NOT EXISTS transfer_image_url TEXT;


-- ========== ALL_FIX_SUBMISSIONS.sql ==========
-- Run this in Supabase SQL Editor to fix all submission-related schema issues
-- Safe to run multiple times (idempotent)

DO $$
BEGIN
  -- ==========================================
  -- FIX submissions table
  -- ==========================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'auto_score') THEN
    ALTER TABLE submissions ADD COLUMN auto_score NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'manual_score') THEN
    ALTER TABLE submissions ADD COLUMN manual_score NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'total_points') THEN
    ALTER TABLE submissions ADD COLUMN total_points NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'started_at') THEN
    ALTER TABLE submissions ADD COLUMN started_at TIMESTAMPTZ DEFAULT now();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'time_spent_seconds') THEN
    ALTER TABLE submissions ADD COLUMN time_spent_seconds INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'updated_at') THEN
    ALTER TABLE submissions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;

  -- ==========================================
  -- FIX submission_answers table
  -- ==========================================

  -- Rename selected_option_id -> selected_option_index if old schema
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'selected_option_id') THEN
    ALTER TABLE submission_answers RENAME COLUMN selected_option_id TO selected_option_index;
    ALTER TABLE submission_answers ALTER COLUMN selected_option_index TYPE INTEGER USING selected_option_index::INTEGER;
  END IF;

  -- Add selected_option_index if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'selected_option_index') THEN
    ALTER TABLE submission_answers ADD COLUMN selected_option_index INTEGER;
  END IF;

  -- Add score column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'score') THEN
    ALTER TABLE submission_answers ADD COLUMN score NUMERIC(6,2);
  END IF;

  -- Rename points_earned -> score if old schema
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'points_earned')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'score') THEN
    ALTER TABLE submission_answers RENAME COLUMN points_earned TO score;
  END IF;

  -- Add feedback column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'feedback') THEN
    ALTER TABLE submission_answers ADD COLUMN feedback TEXT;
  END IF;

  -- Add updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'updated_at') THEN
    ALTER TABLE submission_answers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;

  -- ==========================================
  -- UNIQUE CONSTRAINT for upsert
  -- ==========================================
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submission_answers_submission_question_unique') THEN
    -- Delete duplicates first
    DELETE FROM submission_answers a USING submission_answers b
    WHERE a.id > b.id AND a.submission_id = b.submission_id AND a.question_id = b.question_id;

    ALTER TABLE submission_answers 
    ADD CONSTRAINT submission_answers_submission_question_unique 
    UNIQUE (submission_id, question_id);
  END IF;

  RAISE NOTICE 'All submission schema fixes applied successfully!';
END $$;


-- ========== _all_migrations.sql ==========
-- ========== 000_extensions.sql ==========
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ========== 001_enrollment_requests.sql ==========
-- ========== enrollment_requests ==========
-- Stores teacher requests to add students to classes, pending admin approval

CREATE TABLE IF NOT EXISTS enrollment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  note TEXT,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent duplicate pending requests for same student+class
  UNIQUE(class_id, student_id, status)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_status ON enrollment_requests(status);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_class ON enrollment_requests(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_requested_by ON enrollment_requests(requested_by);


-- ========== 002_template_permissions.sql ==========
-- ========== template_permissions ==========
-- Controls which templates teachers are allowed to use.
-- If a template has no rows here, only admin can use it.
-- If teacher_id is NULL, ALL teachers can use it.

CREATE TABLE IF NOT EXISTS template_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type VARCHAR(20) NOT NULL CHECK (template_type IN ('lesson', 'assignment')),
  template_id UUID NOT NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique: one permission per template+teacher combo (NULL teacher = all)
  UNIQUE(template_type, template_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_template_permissions_template ON template_permissions(template_type, template_id);
CREATE INDEX IF NOT EXISTS idx_template_permissions_teacher ON template_permissions(teacher_id);


-- ========== 003_schedules_date_range.sql ==========
-- ========== Add date range to schedules ==========
-- Schedules now have start_date and end_date to limit recurring display range.

ALTER TABLE schedules ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS end_date DATE;

CREATE INDEX IF NOT EXISTS idx_schedules_date_range ON schedules(start_date, end_date);


-- ========== 004_submissions.sql ==========
-- ========== submissions ==========
-- Stores student assignment submissions

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
  score NUMERIC(6,2),
  total_points NUMERIC(6,2),
  auto_score NUMERIC(6,2),
  manual_score NUMERIC(6,2),
  feedback TEXT,
  graded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  graded_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  time_spent_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One active submission per student per assignment
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_student_assignment
  ON submissions(assignment_id, student_id)
  WHERE status != 'in_progress';

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

-- ========== submission_answers ==========
-- Individual answers for each question in a submission

CREATE TABLE IF NOT EXISTS submission_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES assignment_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  selected_option_index INTEGER,
  is_correct BOOLEAN,
  score NUMERIC(6,2),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(submission_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_submission_answers_submission ON submission_answers(submission_id);


-- ========== 005_fix_submissions_schema.sql ==========
-- Fix: rename selected_option_id to selected_option_index (if old schema)
-- and change type from TEXT to INTEGER

DO $$
BEGIN
  -- If old column exists, rename and change type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submission_answers' AND column_name = 'selected_option_id'
  ) THEN
    ALTER TABLE submission_answers RENAME COLUMN selected_option_id TO selected_option_index;
    ALTER TABLE submission_answers ALTER COLUMN selected_option_index TYPE INTEGER USING selected_option_index::INTEGER;
    RAISE NOTICE 'Renamed selected_option_id -> selected_option_index (INTEGER)';
  END IF;

  -- If column doesn't exist at all, add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submission_answers' AND column_name = 'selected_option_index'
  ) THEN
    ALTER TABLE submission_answers ADD COLUMN selected_option_index INTEGER;
    RAISE NOTICE 'Added selected_option_index column';
  END IF;

  -- Ensure submissions has all needed columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'auto_score'
  ) THEN
    ALTER TABLE submissions ADD COLUMN auto_score NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'manual_score'
  ) THEN
    ALTER TABLE submissions ADD COLUMN manual_score NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'total_points'
  ) THEN
    ALTER TABLE submissions ADD COLUMN total_points NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE submissions ADD COLUMN started_at TIMESTAMPTZ DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'time_spent_seconds'
  ) THEN
    ALTER TABLE submissions ADD COLUMN time_spent_seconds INTEGER;
  END IF;

  -- Ensure submission_answers has score column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submission_answers' AND column_name = 'score'
  ) THEN
    ALTER TABLE submission_answers ADD COLUMN score NUMERIC(6,2);
  END IF;

  -- Ensure submission_answers has updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submission_answers' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE submission_answers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;

END $$;


-- ========== 006_fix_submission_answers_unique.sql ==========
-- Ensure unique constraint for submission_answers upsert
DO $$
BEGIN
  -- Add unique constraint on (submission_id, question_id) if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'submission_answers_submission_question_unique'
  ) THEN
    -- First delete duplicates if any
    DELETE FROM submission_answers a USING submission_answers b
    WHERE a.id > b.id 
    AND a.submission_id = b.submission_id 
    AND a.question_id = b.question_id;

    ALTER TABLE submission_answers 
    ADD CONSTRAINT submission_answers_submission_question_unique 
    UNIQUE (submission_id, question_id);
    
    RAISE NOTICE 'Added unique constraint on submission_answers(submission_id, question_id)';
  END IF;
END $$;


-- ========== 007_ensure_submission_columns.sql ==========
-- Ensure all submission-related columns exist (safe to run multiple times)
-- Run this in Supabase SQL Editor if you get 500 errors on submit

DO $$
BEGIN
  -- ==========================================
  -- submissions table columns
  -- ==========================================
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'auto_score') THEN
    ALTER TABLE submissions ADD COLUMN auto_score NUMERIC(6,2);
    RAISE NOTICE 'Added submissions.auto_score';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'manual_score') THEN
    ALTER TABLE submissions ADD COLUMN manual_score NUMERIC(6,2);
    RAISE NOTICE 'Added submissions.manual_score';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'total_points') THEN
    ALTER TABLE submissions ADD COLUMN total_points NUMERIC(6,2);
    RAISE NOTICE 'Added submissions.total_points';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'started_at') THEN
    ALTER TABLE submissions ADD COLUMN started_at TIMESTAMPTZ DEFAULT now();
    RAISE NOTICE 'Added submissions.started_at';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'time_spent_seconds') THEN
    ALTER TABLE submissions ADD COLUMN time_spent_seconds INTEGER;
    RAISE NOTICE 'Added submissions.time_spent_seconds';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'updated_at') THEN
    ALTER TABLE submissions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    RAISE NOTICE 'Added submissions.updated_at';
  END IF;

  -- ==========================================
  -- submission_answers table columns
  -- ==========================================
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'selected_option_index') THEN
    ALTER TABLE submission_answers ADD COLUMN selected_option_index INTEGER;
    RAISE NOTICE 'Added submission_answers.selected_option_index';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'score') THEN
    ALTER TABLE submission_answers ADD COLUMN score NUMERIC(6,2);
    RAISE NOTICE 'Added submission_answers.score';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'feedback') THEN
    ALTER TABLE submission_answers ADD COLUMN feedback TEXT;
    RAISE NOTICE 'Added submission_answers.feedback';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'updated_at') THEN
    ALTER TABLE submission_answers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    RAISE NOTICE 'Added submission_answers.updated_at';
  END IF;

  -- ==========================================
  -- UNIQUE constraint for upsert
  -- ==========================================
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submission_answers_submission_question_unique') THEN
    -- Remove duplicates first
    DELETE FROM submission_answers a USING submission_answers b
    WHERE a.id > b.id AND a.submission_id = b.submission_id AND a.question_id = b.question_id;

    ALTER TABLE submission_answers
    ADD CONSTRAINT submission_answers_submission_question_unique
    UNIQUE (submission_id, question_id);
    RAISE NOTICE 'Added unique constraint on submission_answers(submission_id, question_id)';
  END IF;

  RAISE NOTICE '✅ All submission columns ensured!';
END $$;


-- ========== 009_question_bank.sql ==========
-- Ngân hàng câu hỏi: metadata + đường dẫn file trên Supabase Storage (bucket cấu hình bởi QUESTION_BANK_BUCKET).
-- Tạo bucket "question-bank" (hoặc tên khác) trong Supabase Dashboard → Storage, bật public nếu dùng URL công khai.

CREATE TABLE IF NOT EXISTS question_bank_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT,
  question_text TEXT NOT NULL DEFAULT '',
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  options JSONB,
  correct_answer TEXT,
  points INTEGER NOT NULL DEFAULT 1,
  file_url TEXT,
  youtube_url TEXT,
  file_storage_path TEXT,
  audio_storage_path TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  skill TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_bank_skill ON question_bank_items(skill);
CREATE INDEX IF NOT EXISTS idx_question_bank_created ON question_bank_items(created_by);
CREATE INDEX IF NOT EXISTS idx_question_bank_created_at ON question_bank_items(created_at DESC);


-- ========== 010_assignment_questions_toeic_meta.sql ==========
-- Metadata TOEIC (Part, kỹ năng, timer speaking/writing, …) — JSON linh hoạt.
ALTER TABLE assignment_questions
  ADD COLUMN IF NOT EXISTS toeic_meta JSONB DEFAULT NULL;

COMMENT ON COLUMN assignment_questions.toeic_meta IS 'TOEIC: { skill, part, task_code, prep_seconds, answer_seconds, hide_options_text, … }';


-- ========== 011_assignments_toeic_types_check.sql ==========
-- Mở rộng CHECK cho assignments.assignment_type & assignment_questions.question_type (TOEIC).
-- Nếu ADD CONSTRAINT báo lỗi 23514: có dòng không khớp — script này chuẩn hóa dữ liệu trước.

-- (Tuỳ chọn) Xem giá trị đang có:
-- SELECT DISTINCT assignment_type FROM assignments;
-- SELECT DISTINCT question_type FROM assignment_questions;

-- 1) Gỡ CHECK cũ trên assignments.assignment_type
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'assignments'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%assignment_type%'
  ) LOOP
    EXECUTE format('ALTER TABLE assignments DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 2) Chuẩn hóa dữ liệu trước khi thêm CHECK mới
UPDATE assignments
SET assignment_type = 'mixed'
WHERE assignment_type IS NULL
   OR trim(assignment_type) = ''
   OR lower(trim(assignment_type)) NOT IN (
        'essay',
        'multiple_choice',
        'mixed',
        'toeic_listening',
        'toeic_lr',
        'toeic_four_skills'
      );

ALTER TABLE assignments ADD CONSTRAINT assignments_assignment_type_check CHECK (
  assignment_type IN (
    'essay',
    'multiple_choice',
    'mixed',
    'toeic_listening',
    'toeic_lr',
    'toeic_four_skills'
  )
);

-- 3) Gỡ CHECK cũ trên assignment_questions.question_type
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'assignment_questions'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%question_type%'
  ) LOOP
    EXECUTE format('ALTER TABLE assignment_questions DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 4) Chuẩn hóa câu hỏi — giá trị lạ → essay (an toàn cho tự luận)
UPDATE assignment_questions
SET question_type = 'essay'
WHERE question_type IS NULL
   OR trim(question_type) = ''
   OR lower(trim(question_type)) NOT IN (
        'essay',
        'multiple_choice',
        'toeic_speaking',
        'toeic_writing'
      );

ALTER TABLE assignment_questions ADD CONSTRAINT assignment_questions_question_type_check CHECK (
  question_type IN (
    'essay',
    'multiple_choice',
    'toeic_speaking',
    'toeic_writing'
  )
);


-- ========== 012_assignments_allow_retake.sql ==========
-- Cho phép học sinh làm lại bài (nhiều lần nộp). Chỉ giới hạn tối đa 1 bài trạng thái in_progress.

DROP INDEX IF EXISTS idx_submissions_student_assignment;

CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_student_assignment_in_progress
  ON submissions(assignment_id, student_id)
  WHERE (status = 'in_progress');

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS allow_retake BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN assignments.allow_retake IS 'Học sinh được làm lại sau khi đã nộp (lượt mới tạo submission mới)';


-- ========== 013_assignments_max_attempts.sql ==========
-- Giới hạn số lần nộp bài (tính mọi lượt). NULL hoặc 0 = không giới hạn khi allow_retake.

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NULL;

COMMENT ON COLUMN assignments.max_attempts IS 'Tối đa số lần nộp (mỗi lần nộp = 1 lượt). NULL hoặc 0 = không giới hạn nếu allow_retake.';


-- ========== 014_assignments_listening_exam_mode.sql ==========
-- Chế độ thi mô phỏng cho TOEIC Listening: audio tự phát, có khoảng chờ tích đáp án rồi tự chuyển câu.
-- Khi listening_exam_mode = true, học sinh không thể tua audio / quay lại câu trước (giống thi thật).

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS listening_exam_mode BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS listening_answer_seconds INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS listening_part34_answer_seconds INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS listening_directions_seconds INTEGER NOT NULL DEFAULT 25;

COMMENT ON COLUMN assignments.listening_exam_mode IS 'TOEIC Listening: bật chế độ thi mô phỏng (autoplay + auto-next + khoá tương tác).';
COMMENT ON COLUMN assignments.listening_answer_seconds IS 'Số giây chờ HS chọn đáp án sau mỗi audio Part 1/2 (mặc định 5s).';
COMMENT ON COLUMN assignments.listening_part34_answer_seconds IS 'Số giây chờ HS chọn đáp án giữa các câu thuộc 1 nhóm Part 3/4 (mặc định 8s).';
COMMENT ON COLUMN assignments.listening_directions_seconds IS 'Số giây hiển thị phần Directions ở đầu mỗi part (mặc định 25s).';


-- ========== 015_tuition.sql ==========
-- ========== 015_tuition.sql ==========
-- Tuition fee accounting: invoices, items, payments
-- Extends classes table with fee policy configuration

-- ----- 1. Extend classes with fee policy -----
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS fee_policy VARCHAR(20)
    CHECK (fee_policy IN ('per_class', 'monthly', 'per_session'));

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(12, 2) DEFAULT 0;

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS billing_day SMALLINT DEFAULT 1
    CHECK (billing_day BETWEEN 1 AND 28);

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS sessions_per_period SMALLINT DEFAULT 0;

-- ----- 2. tuition_invoices -----
CREATE TABLE IF NOT EXISTS tuition_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no VARCHAR(32) UNIQUE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  fee_policy VARCHAR(20) NOT NULL CHECK (fee_policy IN ('per_class', 'monthly', 'per_session')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'unpaid'
    CHECK (status IN ('unpaid', 'partial', 'paid', 'overdue', 'cancelled')),
  note TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (student_id, class_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_tuition_invoices_student ON tuition_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_tuition_invoices_class ON tuition_invoices(class_id);
CREATE INDEX IF NOT EXISTS idx_tuition_invoices_status ON tuition_invoices(status);
CREATE INDEX IF NOT EXISTS idx_tuition_invoices_period ON tuition_invoices(period_start, period_end);

-- Auto generate invoice_no like INV-202605-000001
CREATE SEQUENCE IF NOT EXISTS tuition_invoice_no_seq START 1;

CREATE OR REPLACE FUNCTION set_tuition_invoice_no() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_no IS NULL OR NEW.invoice_no = '' THEN
    NEW.invoice_no := 'INV-' || to_char(now(), 'YYYYMM') || '-' ||
                      lpad(nextval('tuition_invoice_no_seq')::text, 6, '0');
  END IF;
  NEW.balance := COALESCE(NEW.total, 0) - COALESCE(NEW.paid_amount, 0);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tuition_invoice_no ON tuition_invoices;
CREATE TRIGGER trg_tuition_invoice_no
  BEFORE INSERT OR UPDATE ON tuition_invoices
  FOR EACH ROW EXECUTE FUNCTION set_tuition_invoice_no();

-- ----- 3. tuition_invoice_items -----
CREATE TABLE IF NOT EXISTS tuition_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES tuition_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tuition_invoice_items_invoice ON tuition_invoice_items(invoice_id);

-- ----- 4. tuition_payments -----
CREATE TABLE IF NOT EXISTS tuition_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no VARCHAR(32) UNIQUE,
  invoice_id UUID NOT NULL REFERENCES tuition_invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(20) NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'other')),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  collected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  finance_id UUID REFERENCES finances(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tuition_payments_invoice ON tuition_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_tuition_payments_paid_at ON tuition_payments(paid_at);

CREATE SEQUENCE IF NOT EXISTS tuition_receipt_no_seq START 1;

CREATE OR REPLACE FUNCTION set_tuition_receipt_no() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receipt_no IS NULL OR NEW.receipt_no = '' THEN
    NEW.receipt_no := 'RC-' || to_char(now(), 'YYYYMM') || '-' ||
                      lpad(nextval('tuition_receipt_no_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tuition_receipt_no ON tuition_payments;
CREATE TRIGGER trg_tuition_receipt_no
  BEFORE INSERT ON tuition_payments
  FOR EACH ROW EXECUTE FUNCTION set_tuition_receipt_no();

-- ----- 5. Auto-update invoice paid_amount/status when payments change -----
CREATE OR REPLACE FUNCTION sync_invoice_from_payments() RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_total NUMERIC(12, 2);
  v_paid NUMERIC(12, 2);
  v_due DATE;
  v_status VARCHAR(20);
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  SELECT total, due_date INTO v_total, v_due
  FROM tuition_invoices WHERE id = v_invoice_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM tuition_payments WHERE invoice_id = v_invoice_id;

  IF v_paid >= v_total AND v_total > 0 THEN
    v_status := 'paid';
  ELSIF v_paid > 0 THEN
    v_status := 'partial';
  ELSIF v_due IS NOT NULL AND v_due < CURRENT_DATE THEN
    v_status := 'overdue';
  ELSE
    v_status := 'unpaid';
  END IF;

  UPDATE tuition_invoices
  SET paid_amount = v_paid,
      balance = COALESCE(total, 0) - v_paid,
      status = CASE WHEN status = 'cancelled' THEN 'cancelled' ELSE v_status END,
      updated_at = now()
  WHERE id = v_invoice_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_invoice_after_payment ON tuition_payments;
CREATE TRIGGER trg_sync_invoice_after_payment
  AFTER INSERT OR UPDATE OR DELETE ON tuition_payments
  FOR EACH ROW EXECUTE FUNCTION sync_invoice_from_payments();


-- ========== ALL_FIX_SUBMISSIONS.sql ==========
-- Run this in Supabase SQL Editor to fix all submission-related schema issues
-- Safe to run multiple times (idempotent)

DO $$
BEGIN
  -- ==========================================
  -- FIX submissions table
  -- ==========================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'auto_score') THEN
    ALTER TABLE submissions ADD COLUMN auto_score NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'manual_score') THEN
    ALTER TABLE submissions ADD COLUMN manual_score NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'total_points') THEN
    ALTER TABLE submissions ADD COLUMN total_points NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'started_at') THEN
    ALTER TABLE submissions ADD COLUMN started_at TIMESTAMPTZ DEFAULT now();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'time_spent_seconds') THEN
    ALTER TABLE submissions ADD COLUMN time_spent_seconds INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'updated_at') THEN
    ALTER TABLE submissions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;

  -- ==========================================
  -- FIX submission_answers table
  -- ==========================================

  -- Rename selected_option_id -> selected_option_index if old schema
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'selected_option_id') THEN
    ALTER TABLE submission_answers RENAME COLUMN selected_option_id TO selected_option_index;
    ALTER TABLE submission_answers ALTER COLUMN selected_option_index TYPE INTEGER USING selected_option_index::INTEGER;
  END IF;

  -- Add selected_option_index if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'selected_option_index') THEN
    ALTER TABLE submission_answers ADD COLUMN selected_option_index INTEGER;
  END IF;

  -- Add score column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'score') THEN
    ALTER TABLE submission_answers ADD COLUMN score NUMERIC(6,2);
  END IF;

  -- Rename points_earned -> score if old schema
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'points_earned')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'score') THEN
    ALTER TABLE submission_answers RENAME COLUMN points_earned TO score;
  END IF;

  -- Add feedback column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'feedback') THEN
    ALTER TABLE submission_answers ADD COLUMN feedback TEXT;
  END IF;

  -- Add updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'updated_at') THEN
    ALTER TABLE submission_answers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;

  -- ==========================================
  -- UNIQUE CONSTRAINT for upsert
  -- ==========================================
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submission_answers_submission_question_unique') THEN
    -- Delete duplicates first
    DELETE FROM submission_answers a USING submission_answers b
    WHERE a.id > b.id AND a.submission_id = b.submission_id AND a.question_id = b.question_id;

    ALTER TABLE submission_answers 
    ADD CONSTRAINT submission_answers_submission_question_unique 
    UNIQUE (submission_id, question_id);
  END IF;

  RAISE NOTICE 'All submission schema fixes applied successfully!';
END $$;


-- ========== _all_migrations.sql ==========
-- ========== 000_extensions.sql ==========
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ========== 001_enrollment_requests.sql ==========
-- ========== enrollment_requests ==========
-- Stores teacher requests to add students to classes, pending admin approval

CREATE TABLE IF NOT EXISTS enrollment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  note TEXT,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent duplicate pending requests for same student+class
  UNIQUE(class_id, student_id, status)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_status ON enrollment_requests(status);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_class ON enrollment_requests(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_requested_by ON enrollment_requests(requested_by);


-- ========== 002_template_permissions.sql ==========
-- ========== template_permissions ==========
-- Controls which templates teachers are allowed to use.
-- If a template has no rows here, only admin can use it.
-- If teacher_id is NULL, ALL teachers can use it.

CREATE TABLE IF NOT EXISTS template_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type VARCHAR(20) NOT NULL CHECK (template_type IN ('lesson', 'assignment')),
  template_id UUID NOT NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique: one permission per template+teacher combo (NULL teacher = all)
  UNIQUE(template_type, template_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_template_permissions_template ON template_permissions(template_type, template_id);
CREATE INDEX IF NOT EXISTS idx_template_permissions_teacher ON template_permissions(teacher_id);


-- ========== 003_schedules_date_range.sql ==========
-- ========== Add date range to schedules ==========
-- Schedules now have start_date and end_date to limit recurring display range.

ALTER TABLE schedules ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS end_date DATE;

CREATE INDEX IF NOT EXISTS idx_schedules_date_range ON schedules(start_date, end_date);


-- ========== 004_submissions.sql ==========
-- ========== submissions ==========
-- Stores student assignment submissions

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
  score NUMERIC(6,2),
  total_points NUMERIC(6,2),
  auto_score NUMERIC(6,2),
  manual_score NUMERIC(6,2),
  feedback TEXT,
  graded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  graded_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  time_spent_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One active submission per student per assignment
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_student_assignment
  ON submissions(assignment_id, student_id)
  WHERE status != 'in_progress';

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

-- ========== submission_answers ==========
-- Individual answers for each question in a submission

CREATE TABLE IF NOT EXISTS submission_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES assignment_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  selected_option_index INTEGER,
  is_correct BOOLEAN,
  score NUMERIC(6,2),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(submission_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_submission_answers_submission ON submission_answers(submission_id);


-- ========== 005_fix_submissions_schema.sql ==========
-- Fix: rename selected_option_id to selected_option_index (if old schema)
-- and change type from TEXT to INTEGER

DO $$
BEGIN
  -- If old column exists, rename and change type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submission_answers' AND column_name = 'selected_option_id'
  ) THEN
    ALTER TABLE submission_answers RENAME COLUMN selected_option_id TO selected_option_index;
    ALTER TABLE submission_answers ALTER COLUMN selected_option_index TYPE INTEGER USING selected_option_index::INTEGER;
    RAISE NOTICE 'Renamed selected_option_id -> selected_option_index (INTEGER)';
  END IF;

  -- If column doesn't exist at all, add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submission_answers' AND column_name = 'selected_option_index'
  ) THEN
    ALTER TABLE submission_answers ADD COLUMN selected_option_index INTEGER;
    RAISE NOTICE 'Added selected_option_index column';
  END IF;

  -- Ensure submissions has all needed columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'auto_score'
  ) THEN
    ALTER TABLE submissions ADD COLUMN auto_score NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'manual_score'
  ) THEN
    ALTER TABLE submissions ADD COLUMN manual_score NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'total_points'
  ) THEN
    ALTER TABLE submissions ADD COLUMN total_points NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE submissions ADD COLUMN started_at TIMESTAMPTZ DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'time_spent_seconds'
  ) THEN
    ALTER TABLE submissions ADD COLUMN time_spent_seconds INTEGER;
  END IF;

  -- Ensure submission_answers has score column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submission_answers' AND column_name = 'score'
  ) THEN
    ALTER TABLE submission_answers ADD COLUMN score NUMERIC(6,2);
  END IF;

  -- Ensure submission_answers has updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submission_answers' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE submission_answers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;

END $$;


-- ========== 006_fix_submission_answers_unique.sql ==========
-- Ensure unique constraint for submission_answers upsert
DO $$
BEGIN
  -- Add unique constraint on (submission_id, question_id) if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'submission_answers_submission_question_unique'
  ) THEN
    -- First delete duplicates if any
    DELETE FROM submission_answers a USING submission_answers b
    WHERE a.id > b.id 
    AND a.submission_id = b.submission_id 
    AND a.question_id = b.question_id;

    ALTER TABLE submission_answers 
    ADD CONSTRAINT submission_answers_submission_question_unique 
    UNIQUE (submission_id, question_id);
    
    RAISE NOTICE 'Added unique constraint on submission_answers(submission_id, question_id)';
  END IF;
END $$;


-- ========== 007_ensure_submission_columns.sql ==========
-- Ensure all submission-related columns exist (safe to run multiple times)
-- Run this in Supabase SQL Editor if you get 500 errors on submit

DO $$
BEGIN
  -- ==========================================
  -- submissions table columns
  -- ==========================================
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'auto_score') THEN
    ALTER TABLE submissions ADD COLUMN auto_score NUMERIC(6,2);
    RAISE NOTICE 'Added submissions.auto_score';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'manual_score') THEN
    ALTER TABLE submissions ADD COLUMN manual_score NUMERIC(6,2);
    RAISE NOTICE 'Added submissions.manual_score';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'total_points') THEN
    ALTER TABLE submissions ADD COLUMN total_points NUMERIC(6,2);
    RAISE NOTICE 'Added submissions.total_points';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'started_at') THEN
    ALTER TABLE submissions ADD COLUMN started_at TIMESTAMPTZ DEFAULT now();
    RAISE NOTICE 'Added submissions.started_at';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'time_spent_seconds') THEN
    ALTER TABLE submissions ADD COLUMN time_spent_seconds INTEGER;
    RAISE NOTICE 'Added submissions.time_spent_seconds';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'updated_at') THEN
    ALTER TABLE submissions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    RAISE NOTICE 'Added submissions.updated_at';
  END IF;

  -- ==========================================
  -- submission_answers table columns
  -- ==========================================
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'selected_option_index') THEN
    ALTER TABLE submission_answers ADD COLUMN selected_option_index INTEGER;
    RAISE NOTICE 'Added submission_answers.selected_option_index';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'score') THEN
    ALTER TABLE submission_answers ADD COLUMN score NUMERIC(6,2);
    RAISE NOTICE 'Added submission_answers.score';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'feedback') THEN
    ALTER TABLE submission_answers ADD COLUMN feedback TEXT;
    RAISE NOTICE 'Added submission_answers.feedback';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'updated_at') THEN
    ALTER TABLE submission_answers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    RAISE NOTICE 'Added submission_answers.updated_at';
  END IF;

  -- ==========================================
  -- UNIQUE constraint for upsert
  -- ==========================================
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submission_answers_submission_question_unique') THEN
    -- Remove duplicates first
    DELETE FROM submission_answers a USING submission_answers b
    WHERE a.id > b.id AND a.submission_id = b.submission_id AND a.question_id = b.question_id;

    ALTER TABLE submission_answers
    ADD CONSTRAINT submission_answers_submission_question_unique
    UNIQUE (submission_id, question_id);
    RAISE NOTICE 'Added unique constraint on submission_answers(submission_id, question_id)';
  END IF;

  RAISE NOTICE '✅ All submission columns ensured!';
END $$;


-- ========== 009_question_bank.sql ==========
-- Ngân hàng câu hỏi: metadata + đường dẫn file trên Supabase Storage (bucket cấu hình bởi QUESTION_BANK_BUCKET).
-- Tạo bucket "question-bank" (hoặc tên khác) trong Supabase Dashboard → Storage, bật public nếu dùng URL công khai.

CREATE TABLE IF NOT EXISTS question_bank_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT,
  question_text TEXT NOT NULL DEFAULT '',
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  options JSONB,
  correct_answer TEXT,
  points INTEGER NOT NULL DEFAULT 1,
  file_url TEXT,
  youtube_url TEXT,
  file_storage_path TEXT,
  audio_storage_path TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  skill TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_bank_skill ON question_bank_items(skill);
CREATE INDEX IF NOT EXISTS idx_question_bank_created ON question_bank_items(created_by);
CREATE INDEX IF NOT EXISTS idx_question_bank_created_at ON question_bank_items(created_at DESC);


-- ========== 010_assignment_questions_toeic_meta.sql ==========
-- Metadata TOEIC (Part, kỹ năng, timer speaking/writing, …) — JSON linh hoạt.
ALTER TABLE assignment_questions
  ADD COLUMN IF NOT EXISTS toeic_meta JSONB DEFAULT NULL;

COMMENT ON COLUMN assignment_questions.toeic_meta IS 'TOEIC: { skill, part, task_code, prep_seconds, answer_seconds, hide_options_text, … }';


-- ========== 011_assignments_toeic_types_check.sql ==========
-- Mở rộng CHECK cho assignments.assignment_type & assignment_questions.question_type (TOEIC).
-- Nếu ADD CONSTRAINT báo lỗi 23514: có dòng không khớp — script này chuẩn hóa dữ liệu trước.

-- (Tuỳ chọn) Xem giá trị đang có:
-- SELECT DISTINCT assignment_type FROM assignments;
-- SELECT DISTINCT question_type FROM assignment_questions;

-- 1) Gỡ CHECK cũ trên assignments.assignment_type
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'assignments'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%assignment_type%'
  ) LOOP
    EXECUTE format('ALTER TABLE assignments DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 2) Chuẩn hóa dữ liệu trước khi thêm CHECK mới
UPDATE assignments
SET assignment_type = 'mixed'
WHERE assignment_type IS NULL
   OR trim(assignment_type) = ''
   OR lower(trim(assignment_type)) NOT IN (
        'essay',
        'multiple_choice',
        'mixed',
        'toeic_listening',
        'toeic_lr',
        'toeic_four_skills'
      );

ALTER TABLE assignments ADD CONSTRAINT assignments_assignment_type_check CHECK (
  assignment_type IN (
    'essay',
    'multiple_choice',
    'mixed',
    'toeic_listening',
    'toeic_lr',
    'toeic_four_skills'
  )
);

-- 3) Gỡ CHECK cũ trên assignment_questions.question_type
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'assignment_questions'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%question_type%'
  ) LOOP
    EXECUTE format('ALTER TABLE assignment_questions DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 4) Chuẩn hóa câu hỏi — giá trị lạ → essay (an toàn cho tự luận)
UPDATE assignment_questions
SET question_type = 'essay'
WHERE question_type IS NULL
   OR trim(question_type) = ''
   OR lower(trim(question_type)) NOT IN (
        'essay',
        'multiple_choice',
        'toeic_speaking',
        'toeic_writing'
      );

ALTER TABLE assignment_questions ADD CONSTRAINT assignment_questions_question_type_check CHECK (
  question_type IN (
    'essay',
    'multiple_choice',
    'toeic_speaking',
    'toeic_writing'
  )
);


-- ========== 012_assignments_allow_retake.sql ==========
-- Cho phép học sinh làm lại bài (nhiều lần nộp). Chỉ giới hạn tối đa 1 bài trạng thái in_progress.

DROP INDEX IF EXISTS idx_submissions_student_assignment;

CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_student_assignment_in_progress
  ON submissions(assignment_id, student_id)
  WHERE (status = 'in_progress');

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS allow_retake BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN assignments.allow_retake IS 'Học sinh được làm lại sau khi đã nộp (lượt mới tạo submission mới)';


-- ========== 013_assignments_max_attempts.sql ==========
-- Giới hạn số lần nộp bài (tính mọi lượt). NULL hoặc 0 = không giới hạn khi allow_retake.

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NULL;

COMMENT ON COLUMN assignments.max_attempts IS 'Tối đa số lần nộp (mỗi lần nộp = 1 lượt). NULL hoặc 0 = không giới hạn nếu allow_retake.';


-- ========== 014_assignments_listening_exam_mode.sql ==========
-- Chế độ thi mô phỏng cho TOEIC Listening: audio tự phát, có khoảng chờ tích đáp án rồi tự chuyển câu.
-- Khi listening_exam_mode = true, học sinh không thể tua audio / quay lại câu trước (giống thi thật).

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS listening_exam_mode BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS listening_answer_seconds INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS listening_part34_answer_seconds INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS listening_directions_seconds INTEGER NOT NULL DEFAULT 25;

COMMENT ON COLUMN assignments.listening_exam_mode IS 'TOEIC Listening: bật chế độ thi mô phỏng (autoplay + auto-next + khoá tương tác).';
COMMENT ON COLUMN assignments.listening_answer_seconds IS 'Số giây chờ HS chọn đáp án sau mỗi audio Part 1/2 (mặc định 5s).';
COMMENT ON COLUMN assignments.listening_part34_answer_seconds IS 'Số giây chờ HS chọn đáp án giữa các câu thuộc 1 nhóm Part 3/4 (mặc định 8s).';
COMMENT ON COLUMN assignments.listening_directions_seconds IS 'Số giây hiển thị phần Directions ở đầu mỗi part (mặc định 25s).';


-- ========== ALL_FIX_SUBMISSIONS.sql ==========
-- Run this in Supabase SQL Editor to fix all submission-related schema issues
-- Safe to run multiple times (idempotent)

DO $$
BEGIN
  -- ==========================================
  -- FIX submissions table
  -- ==========================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'auto_score') THEN
    ALTER TABLE submissions ADD COLUMN auto_score NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'manual_score') THEN
    ALTER TABLE submissions ADD COLUMN manual_score NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'total_points') THEN
    ALTER TABLE submissions ADD COLUMN total_points NUMERIC(6,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'started_at') THEN
    ALTER TABLE submissions ADD COLUMN started_at TIMESTAMPTZ DEFAULT now();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'time_spent_seconds') THEN
    ALTER TABLE submissions ADD COLUMN time_spent_seconds INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'updated_at') THEN
    ALTER TABLE submissions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;

  -- ==========================================
  -- FIX submission_answers table
  -- ==========================================

  -- Rename selected_option_id -> selected_option_index if old schema
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'selected_option_id') THEN
    ALTER TABLE submission_answers RENAME COLUMN selected_option_id TO selected_option_index;
    ALTER TABLE submission_answers ALTER COLUMN selected_option_index TYPE INTEGER USING selected_option_index::INTEGER;
  END IF;

  -- Add selected_option_index if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'selected_option_index') THEN
    ALTER TABLE submission_answers ADD COLUMN selected_option_index INTEGER;
  END IF;

  -- Add score column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'score') THEN
    ALTER TABLE submission_answers ADD COLUMN score NUMERIC(6,2);
  END IF;

  -- Rename points_earned -> score if old schema
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'points_earned')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'score') THEN
    ALTER TABLE submission_answers RENAME COLUMN points_earned TO score;
  END IF;

  -- Add feedback column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'feedback') THEN
    ALTER TABLE submission_answers ADD COLUMN feedback TEXT;
  END IF;

  -- Add updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submission_answers' AND column_name = 'updated_at') THEN
    ALTER TABLE submission_answers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;

  -- ==========================================
  -- UNIQUE CONSTRAINT for upsert
  -- ==========================================
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submission_answers_submission_question_unique') THEN
    -- Delete duplicates first
    DELETE FROM submission_answers a USING submission_answers b
    WHERE a.id > b.id AND a.submission_id = b.submission_id AND a.question_id = b.question_id;

    ALTER TABLE submission_answers 
    ADD CONSTRAINT submission_answers_submission_question_unique 
    UNIQUE (submission_id, question_id);
  END IF;

  RAISE NOTICE 'All submission schema fixes applied successfully!';
END $$;











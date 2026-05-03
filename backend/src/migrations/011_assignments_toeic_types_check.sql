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

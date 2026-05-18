-- ========== 020_class_enrollment_date.sql ==========
-- Ngày nhập học (business date) để tính học phí theo tháng đến khi lớp kết thúc

ALTER TABLE class_students
  ADD COLUMN IF NOT EXISTS enrollment_date DATE;

UPDATE class_students SET enrollment_date = COALESCE(
  (enrolled_at AT TIME ZONE 'UTC')::date,
  CURRENT_DATE
) WHERE enrollment_date IS NULL;

ALTER TABLE class_students ALTER COLUMN enrollment_date SET DEFAULT CURRENT_DATE;

UPDATE class_students SET enrollment_date = CURRENT_DATE WHERE enrollment_date IS NULL;

ALTER TABLE class_students ALTER COLUMN enrollment_date SET NOT NULL;

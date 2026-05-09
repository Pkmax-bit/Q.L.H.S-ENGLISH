-- Cho phép học sinh làm lại bài (nhiều lần nộp). Chỉ giới hạn tối đa 1 bài trạng thái in_progress.

DROP INDEX IF EXISTS idx_submissions_student_assignment;

CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_student_assignment_in_progress
  ON submissions(assignment_id, student_id)
  WHERE (status = 'in_progress');

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS allow_retake BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN assignments.allow_retake IS 'Học sinh được làm lại sau khi đã nộp (lượt mới tạo submission mới)';

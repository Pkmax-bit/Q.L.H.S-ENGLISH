-- Giới hạn số lần nộp bài (tính mọi lượt). NULL hoặc 0 = không giới hạn khi allow_retake.

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NULL;

COMMENT ON COLUMN assignments.max_attempts IS 'Tối đa số lần nộp (mỗi lần nộp = 1 lượt). NULL hoặc 0 = không giới hạn nếu allow_retake.';

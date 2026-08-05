-- ========== 023_session_lesson_reviews.sql ==========
-- Liên kết buổi học ↔ bài học + 3 loại nhận xét (ghi trong 12h sau buổi)

ALTER TABLE class_sessions
  ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL;

ALTER TABLE class_sessions
  ADD COLUMN IF NOT EXISTS review_content TEXT;

ALTER TABLE class_sessions
  ADD COLUMN IF NOT EXISTS review_students TEXT;

ALTER TABLE class_sessions
  ADD COLUMN IF NOT EXISTS review_followup TEXT;

ALTER TABLE class_sessions
  ADD COLUMN IF NOT EXISTS review_submitted_at TIMESTAMPTZ;

ALTER TABLE class_sessions
  ADD COLUMN IF NOT EXISTS review_submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_class_sessions_lesson ON class_sessions(lesson_id);

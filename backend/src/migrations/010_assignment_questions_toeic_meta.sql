-- Metadata TOEIC (Part, kỹ năng, timer speaking/writing, …) — JSON linh hoạt.
ALTER TABLE assignment_questions
  ADD COLUMN IF NOT EXISTS toeic_meta JSONB DEFAULT NULL;

COMMENT ON COLUMN assignment_questions.toeic_meta IS 'TOEIC: { skill, part, task_code, prep_seconds, answer_seconds, hide_options_text, … }';

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

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

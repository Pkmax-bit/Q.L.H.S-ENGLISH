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

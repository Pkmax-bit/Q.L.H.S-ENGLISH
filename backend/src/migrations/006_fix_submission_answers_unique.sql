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

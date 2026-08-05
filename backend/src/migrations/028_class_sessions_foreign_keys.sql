-- FK class_sessions → classes, schedules, lessons

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_sessions_class_id_fkey'
  ) THEN
    ALTER TABLE class_sessions
      ADD CONSTRAINT class_sessions_class_id_fkey
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_sessions_schedule_id_fkey'
  ) THEN
    ALTER TABLE class_sessions
      ADD CONSTRAINT class_sessions_schedule_id_fkey
      FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_sessions_lesson_id_fkey'
  ) THEN
    ALTER TABLE class_sessions
      ADD CONSTRAINT class_sessions_lesson_id_fkey
      FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL;
  END IF;
END $$;

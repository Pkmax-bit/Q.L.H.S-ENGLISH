-- FK cho Supabase/PostgREST embed (classes → subjects, classes → profiles)
-- An toàn khi chạy lại: chỉ thêm nếu chưa có.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'classes_subject_id_fkey'
  ) THEN
    ALTER TABLE classes
      ADD CONSTRAINT classes_subject_id_fkey
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'classes_teacher_id_fkey'
  ) THEN
    ALTER TABLE classes
      ADD CONSTRAINT classes_teacher_id_fkey
      FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_students_class_id_fkey'
  ) THEN
    ALTER TABLE class_students
      ADD CONSTRAINT class_students_class_id_fkey
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_students_student_id_fkey'
  ) THEN
    ALTER TABLE class_students
      ADD CONSTRAINT class_students_student_id_fkey
      FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- FK lessons → classes / profiles (PostgREST embed classes(name))
-- Bảng lessons từ 000_base_schema thiếu FK nên GET /lessons lỗi PGRST200.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lessons_class_id_fkey'
  ) THEN
    ALTER TABLE lessons
      ADD CONSTRAINT lessons_class_id_fkey
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lessons_created_by_fkey'
  ) THEN
    ALTER TABLE lessons
      ADD CONSTRAINT lessons_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

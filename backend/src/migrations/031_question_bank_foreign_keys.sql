-- FK cho Supabase/PostgREST embed (question_bank_items → profiles)
-- Bảng có thể đã tạo từ 000_base_schema không kèm REFERENCES; 009 IF NOT EXISTS nên bỏ qua.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'question_bank_items_created_by_fkey'
  ) THEN
    ALTER TABLE question_bank_items
      ADD CONSTRAINT question_bank_items_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

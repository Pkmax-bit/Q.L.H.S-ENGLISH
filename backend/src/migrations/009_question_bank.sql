-- Ngân hàng câu hỏi: metadata + đường dẫn file trên Supabase Storage (bucket cấu hình bởi QUESTION_BANK_BUCKET).
-- Tạo bucket "question-bank" (hoặc tên khác) trong Supabase Dashboard → Storage, bật public nếu dùng URL công khai.

CREATE TABLE IF NOT EXISTS question_bank_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT,
  question_text TEXT NOT NULL DEFAULT '',
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  options JSONB,
  correct_answer TEXT,
  points INTEGER NOT NULL DEFAULT 1,
  file_url TEXT,
  youtube_url TEXT,
  file_storage_path TEXT,
  audio_storage_path TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  skill TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_bank_skill ON question_bank_items(skill);
CREATE INDEX IF NOT EXISTS idx_question_bank_created ON question_bank_items(created_by);
CREATE INDEX IF NOT EXISTS idx_question_bank_created_at ON question_bank_items(created_at DESC);

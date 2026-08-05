-- Cloud save cho game shop (JSONB per student + slug)

CREATE TABLE IF NOT EXISTS student_game_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_slug TEXT NOT NULL,
  save_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, item_slug)
);

CREATE INDEX IF NOT EXISTS idx_student_game_saves_student
  ON student_game_saves(student_id);

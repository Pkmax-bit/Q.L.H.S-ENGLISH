-- ============================================================
-- 021_lesson_bundles.sql
-- "Bộ bài học" — gom nhiều bài học (mẫu/template hoặc bài thường)
-- thành một bộ để áp dụng cho lớp. Có thể áp dụng cả bộ
-- hoặc chọn từng bài trong bộ.
-- ============================================================

CREATE TABLE IF NOT EXISTS lesson_bundles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  subject_id  UUID        REFERENCES subjects(id) ON DELETE SET NULL,
  created_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_bundles_subject ON lesson_bundles(subject_id);
CREATE INDEX IF NOT EXISTS idx_lesson_bundles_created_by ON lesson_bundles(created_by);

CREATE TABLE IF NOT EXISTS lesson_bundle_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id   UUID        NOT NULL REFERENCES lesson_bundles(id) ON DELETE CASCADE,
  lesson_id   UUID        NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  order_index INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lesson_bundle_items_unique UNIQUE (bundle_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_bundle_items_bundle ON lesson_bundle_items(bundle_id);
CREATE INDEX IF NOT EXISTS idx_lesson_bundle_items_lesson ON lesson_bundle_items(lesson_id);

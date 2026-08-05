-- Student shop: điểm sao từ bài tập → level + mua game

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS shop_points_balance INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shop_points_earned INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS student_point_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('assignment_score', 'purchase', 'adjust')),
  assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_ledger_student ON student_point_ledger(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_ledger_assignment
  ON student_point_ledger(student_id, assignment_id)
  WHERE reason = 'assignment_score' AND assignment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  cost INTEGER NOT NULL CHECK (cost >= 0),
  play_path TEXT NOT NULL,
  cover_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_shop_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  cost_paid INTEGER NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_shop_purchases_student ON student_shop_purchases(student_id);

INSERT INTO shop_items (slug, title, description, cost, play_path, cover_url, is_active, sort_order)
VALUES (
  'harvest-shot',
  'Harvest Shot',
  'FPS học tiếng Anh: bắn đáp án, trồng cây, đánh boss. Mở khóa bằng điểm sao từ bài tập.',
  50,
  '/games/harvest-shot/index.html',
  NULL,
  TRUE,
  1
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  cost = EXCLUDED.cost,
  play_path = EXCLUDED.play_path,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

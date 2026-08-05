-- Game lesson packs for shop games (Harvest Shot, etc.)

CREATE TABLE IF NOT EXISTS shop_game_content (
  slug TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE shop_game_content IS 'Editable lesson packs for shop games (fill/vocab/boss JSON)';

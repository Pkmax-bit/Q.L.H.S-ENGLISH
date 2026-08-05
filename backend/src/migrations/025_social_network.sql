-- Mạng xã hội nội bộ: bài viết, thích, bình luận + mở rộng profile

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_url text;

DO $$ BEGIN
  ALTER TABLE profiles
    ADD CONSTRAINT profiles_bio_len CHECK (bio IS NULL OR char_length(bio) <= 500);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT social_posts_body_len CHECK (char_length(body) <= 8000)
);

CREATE INDEX IF NOT EXISTS idx_social_posts_feed
  ON social_posts(created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_social_posts_author
  ON social_posts(author_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS social_likes (
  post_id uuid NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_social_likes_user ON social_likes(user_id);

CREATE TABLE IF NOT EXISTS social_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_comments_body_len CHECK (char_length(body) <= 4000)
);

CREATE INDEX IF NOT EXISTS idx_social_comments_post
  ON social_comments(post_id, created_at);

COMMENT ON TABLE social_posts IS 'Bảng tin nội bộ trung tâm';
COMMENT ON TABLE social_likes IS 'Thích bài trên bảng tin';
COMMENT ON TABLE social_comments IS 'Bình luận bài trên bảng tin';

-- Messenger chat nội bộ (theo mô hình QLCV, tham chiếu profiles)

CREATE TABLE IF NOT EXISTS messenger_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_direct BOOLEAN DEFAULT false NOT NULL,
  direct_pair_key TEXT UNIQUE,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS messenger_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES messenger_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS messenger_group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES messenger_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT,
  message_type TEXT DEFAULT 'text',
  attachments JSONB,
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_size INTEGER,
  attachment_mime TEXT,
  reply_to UUID REFERENCES messenger_group_messages(id) ON DELETE SET NULL,
  is_system BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS messenger_read_receipts (
  group_id UUID NOT NULL REFERENCES messenger_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_messenger_group_members_gid ON messenger_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_messenger_group_members_uid ON messenger_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messenger_group_messages_gid_created ON messenger_group_messages(group_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messenger_groups_class ON messenger_groups(class_id) WHERE class_id IS NOT NULL;

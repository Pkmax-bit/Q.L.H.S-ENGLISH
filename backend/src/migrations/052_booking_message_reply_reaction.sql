-- ========== 052_booking_message_reply_reaction.sql ==========
-- Trả lời một tin cụ thể, và thả cảm xúc lên tin.
--
-- `reply_to` đặt tên y như messenger_group_messages (024) để hai hệ chat trong
-- dự án đọc giống nhau. ON DELETE SET NULL: xóa tin gốc thì tin trả lời vẫn
-- còn, chỉ mất phần trích dẫn.
--
-- Cảm xúc để BẢNG RIÊNG chứ không nhét jsonb vào booking_messages:
--   - hai người thả cùng lúc thì hai lệnh ghi đè nhau, mất một cái
--   - cần biết AI đã thả để tô đậm cảm xúc của chính mình, và để bỏ thả
--   - đếm theo emoji chỉ là một câu GROUP BY, không phải đọc rồi sửa rồi ghi
-- Khóa chính ba cột: mỗi người mỗi emoji một lần, thả lại là bỏ.

ALTER TABLE booking_messages
  ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES booking_messages(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS booking_message_reactions (
  message_id uuid NOT NULL REFERENCES booking_messages(id) ON DELETE CASCADE,
  registrant_id uuid NOT NULL REFERENCES booking_registrants(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, registrant_id, emoji),
  CONSTRAINT booking_message_reactions_emoji_len CHECK (char_length(emoji) BETWEEN 1 AND 8)
);

CREATE INDEX IF NOT EXISTS idx_booking_message_reactions_msg
  ON booking_message_reactions(message_id);

COMMENT ON TABLE booking_message_reactions IS
  'Cảm xúc thả lên tin nhắn của bảng đăng ký; mỗi người mỗi emoji một lần';

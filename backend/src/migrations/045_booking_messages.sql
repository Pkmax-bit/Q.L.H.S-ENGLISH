-- ========== 045_booking_messages.sql ==========
-- Khung chat cua phong dang ky: ai vao link va nhap SDT deu binh luan duoc.
--
-- Nguoi gui co the la NGUOI DANG KY (vao bang SDT) hoac TAI KHOAN NOI BO
-- (admin/giao vien tra loi). Hai loai danh tinh khac nhau hoan toan nen dung hai
-- cot rieng thay vi mot cot author_id chung - gop lai se khong biet id do tro
-- vao bang nao, va khong rang buoc khoa ngoai duoc.

CREATE TABLE IF NOT EXISTS booking_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES booking_boards(id) ON DELETE CASCADE,
  registrant_id uuid REFERENCES booking_registrants(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  body text NOT NULL,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT booking_messages_body_len
    CHECK (btrim(body) <> '' AND length(body) <= 1000),
  CONSTRAINT booking_messages_one_author
    CHECK ((registrant_id IS NOT NULL) <> (profile_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_booking_messages_board
  ON booking_messages(board_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_messages_registrant_time
  ON booking_messages(registrant_id, created_at DESC);

COMMENT ON TABLE booking_messages IS 'Binh luan trong phong dang ky; xoa mem bang deleted_at de admin go noi dung xau';
COMMENT ON COLUMN booking_messages.deleted_at IS 'Xoa MEM: giu ban ghi de con truy duoc ai da gui gi khi can xu ly';

ALTER TABLE booking_messages ENABLE ROW LEVEL SECURITY;

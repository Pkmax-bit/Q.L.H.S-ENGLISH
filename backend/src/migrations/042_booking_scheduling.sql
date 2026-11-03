-- ========== 042_booking_scheduling.sql ==========
-- Màn xếp lịch cho admin: gán học viên vào ca, mỗi lần gán chọn một mức giá,
-- gỡ ra thì rơi xuống khu "giờ chờ sắp" để xếp lại sau.
--
-- Vì sao KHÔNG nối thẳng vào tuition_invoices / teacher_pay_entries:
-- hai bảng đó là tiền đang vận hành thật (hóa đơn đã phát, đã thu). Sinh dòng
-- tự động từ màn xếp lịch sẽ làm số liệu học phí lệch mà rất khó truy nguyên.
-- Ở đây chỉ GHI giá kèm mỗi lượt xếp; muốn xuất hóa đơn thì làm bước riêng, có
-- người duyệt.

-- ---------- Mức giá của từng người đăng ký ----------
-- "1 tk có thể 2,3 giá tiền": mỗi người nhiều mức có tên, vd
-- 'Ca thường 200k', 'Ca cuối tuần 300k', 'Kèm riêng 450k'.
CREATE TABLE IF NOT EXISTS booking_price_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registrant_id uuid NOT NULL REFERENCES booking_registrants(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  note text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_price_tiers_amount_nonneg CHECK (amount >= 0),
  CONSTRAINT booking_price_tiers_name_not_blank CHECK (btrim(name) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_booking_price_tier_name
  ON booking_price_tiers(registrant_id, lower(btrim(name)));

-- Mỗi người chỉ một mức mặc định
CREATE UNIQUE INDEX IF NOT EXISTS uniq_booking_price_tier_default
  ON booking_price_tiers(registrant_id)
  WHERE is_default;

CREATE INDEX IF NOT EXISTS idx_booking_price_tiers_registrant
  ON booking_price_tiers(registrant_id);

COMMENT ON TABLE booking_price_tiers IS 'Các mức giá của một người đăng ký; chọn mức nào khi xếp vào ca';

-- ---------- Giá gắn vào từng lượt xếp ----------
ALTER TABLE booking_entries
  ADD COLUMN IF NOT EXISTS price_tier_id uuid REFERENCES booking_price_tiers(id) ON DELETE SET NULL;
ALTER TABLE booking_entries
  ADD COLUMN IF NOT EXISTS price_amount numeric(12,2);
ALTER TABLE booking_entries
  ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- price_amount là BẢN SAO số tiền tại thời điểm xếp, không phải tham chiếu sống.
-- Sửa mức giá về sau không được làm đổi tiền của các buổi đã xếp — nếu không,
-- đối chiếu sổ sách tháng trước sẽ ra con số khác với lúc chốt.
COMMENT ON COLUMN booking_entries.price_amount IS 'Số tiền chốt tại thời điểm xếp (bản sao, không đổi theo booking_price_tiers về sau)';
COMMENT ON COLUMN booking_entries.price_tier_id IS 'Mức giá đã chọn; ON DELETE SET NULL để xóa mức giá không làm mất lượt xếp';

CREATE INDEX IF NOT EXISTS idx_booking_entries_price_tier
  ON booking_entries(price_tier_id);

-- ---------- Khu "giờ chờ sắp" ----------
-- Gỡ một lượt xếp ra khỏi ca thì nó rơi vào đây, giữ nguyên người + mức giá +
-- thời lượng, chờ admin xếp vào ca khác. Không dùng booking_entries với một
-- status mới vì bản ghi ở đây KHÔNG thuộc ca nào (slot_id là NOT NULL).
CREATE TABLE IF NOT EXISTS booking_pool_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES booking_boards(id) ON DELETE CASCADE,
  registrant_id uuid NOT NULL REFERENCES booking_registrants(id) ON DELETE CASCADE,
  price_tier_id uuid REFERENCES booking_price_tiers(id) ON DELETE SET NULL,
  duration_minutes smallint NOT NULL DEFAULT 60,
  note text,
  source text NOT NULL DEFAULT 'manual',
  from_entry_id uuid,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_pool_items_duration CHECK (duration_minutes BETWEEN 5 AND 720),
  CONSTRAINT booking_pool_items_source CHECK (source IN ('manual', 'removed', 'request'))
);

CREATE INDEX IF NOT EXISTS idx_booking_pool_items_board
  ON booking_pool_items(board_id, created_at);
CREATE INDEX IF NOT EXISTS idx_booking_pool_items_registrant
  ON booking_pool_items(registrant_id);

COMMENT ON TABLE booking_pool_items IS 'Giờ chờ sắp: người đã gỡ khỏi ca hoặc chưa xếp, đợi admin xếp vào ca';
COMMENT ON COLUMN booking_pool_items.source IS 'manual = admin tự thêm · removed = gỡ từ một ca · request = chuyển từ nguyện vọng';

ALTER TABLE booking_price_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_pool_items   ENABLE ROW LEVEL SECURITY;

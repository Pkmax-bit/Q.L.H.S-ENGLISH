-- ========== 043_booking_slot_price.sql ==========
-- Học phí gắn theo TỪNG MỐC THỜI GIAN (từng ca), để khi xếp học viên vào ca là
-- tiền tự điền, không phải gõ lại mỗi lần.
--
-- Thứ tự lấy giá khi xếp một người vào ca (xem resolvePrice ở
-- bookingScheduling.service.js), ưu tiên từ riêng đến chung:
--   1. Mức giá admin chọn tay lúc xếp
--   2. Mức giá MẶC ĐỊNH của chính học viên đó   (booking_price_tiers.is_default)
--   3. Học phí của ca                            (cột thêm ở migration này)
--   4. Không có giá
--
-- Vì sao giá của ca là MỘT CON SỐ chứ không trỏ tới booking_price_tiers:
-- price_tiers gắn với một người cụ thể (registrant_id NOT NULL), còn giá ca thì
-- áp cho mọi người học ca đó. Trỏ sang đó sẽ phải nới registrant_id thành
-- nullable và mọi truy vấn "mức giá của người này" đều phải thêm điều kiện lọc.

ALTER TABLE booking_slots
  ADD COLUMN IF NOT EXISTS price_amount numeric(12,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_slots_price_nonneg'
  ) THEN
    ALTER TABLE booking_slots
      ADD CONSTRAINT booking_slots_price_nonneg CHECK (price_amount IS NULL OR price_amount >= 0);
  END IF;
END
$$;

COMMENT ON COLUMN booking_slots.price_amount IS
  'Học phí mặc định của ca này; dùng khi học viên không có mức giá riêng. NULL = chưa đặt';

-- ========== 054_booking_lesson_price.sql ==========
-- Học phí của bảng đăng ký công khai: giá mặc định MỘT BUỔI theo từng học
-- viên, và số tiền THẬT đã chốt của từng buổi khi đóng dấu hoàn thành.
--
-- Vì sao không dùng booking_price_tiers (043) đang có sẵn:
-- price_tiers là các MỨC GIÁ có tên ("Gói 10 buổi", "Giá lẻ") gắn với
-- booking_entries — luồng xếp lớp nội bộ, nơi một người có thể có nhiều mức và
-- admin chọn tay lúc xếp. Bảng công khai chạy trên booking_requests, không
-- đụng tới entries, và chỗ này chỉ cần đúng một con số "một buổi bao nhiêu".
-- Mượn price_tiers sẽ phải bịa tên mức giá cho mỗi học viên và phải quyết định
-- is_default nào thắng — thêm việc mà không thêm thông tin.
--
-- Vì sao amount nằm trên TỪNG BUỔI chứ không nhân giá hiện tại với số buổi:
-- giá đổi theo thời gian. Lấy giá hôm nay nhân cho buổi dạy ba tháng trước thì
-- sổ sách của những tháng đã chốt tự nhiên đổi số. Chốt xong là đóng băng.

ALTER TABLE booking_registrants
  ADD COLUMN IF NOT EXISTS price_per_session numeric(12,2);

ALTER TABLE booking_requests
  ADD COLUMN IF NOT EXISTS amount numeric(12,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_registrants_price_nonneg'
  ) THEN
    ALTER TABLE booking_registrants
      ADD CONSTRAINT booking_registrants_price_nonneg
      CHECK (price_per_session IS NULL OR price_per_session >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_requests_amount_nonneg'
  ) THEN
    ALTER TABLE booking_requests
      ADD CONSTRAINT booking_requests_amount_nonneg
      CHECK (amount IS NULL OR amount >= 0);
  END IF;
END
$$;

-- Cộng tiền chỉ tính buổi ĐÃ chốt, nên chỉ cần đánh chỉ mục phần đó
CREATE INDEX IF NOT EXISTS idx_booking_requests_done_money
  ON booking_requests(board_id, registrant_id)
  WHERE done_at IS NOT NULL;

COMMENT ON COLUMN booking_registrants.price_per_session IS
  'Giá mặc định một buổi của học viên này; NULL = chưa đặt, đóng dấu hoàn thành sẽ không ghi tiền';
COMMENT ON COLUMN booking_requests.amount IS
  'Số tiền thật của buổi này, chốt lúc đóng dấu hoàn thành. NULL = chưa chốt tiền';

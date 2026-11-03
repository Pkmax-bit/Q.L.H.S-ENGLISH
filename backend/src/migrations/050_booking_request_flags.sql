-- ========== 050_booking_request_flags.sql ==========
-- Hai dấu cho một buổi đã đăng ký: ĐÁNH DẤU (để mắt tới) và HOÀN THÀNH (xong việc).
--
-- Người xếp lịch làm việc theo lượt: lướt qua hàng chục buổi, cái nào cần quay
-- lại thì đánh dấu, cái nào chốt xong thì đóng dấu hoàn thành. Không có hai dấu
-- này thì mọi thẻ trông như nhau, phải nhớ trong đầu mình đã xử tới đâu.
--
-- `done_at` là MỐC THỜI GIAN chứ không phải boolean: biết lúc nào chốt mới đối
-- chiếu được với nhật ký, còn muốn hỏi "xong chưa" thì `done_at IS NOT NULL`.
-- `is_marked` thì chỉ cần có/không, nó là cái cờ tạm của người đang làm.

ALTER TABLE booking_requests
  ADD COLUMN IF NOT EXISTS is_marked boolean NOT NULL DEFAULT false;
ALTER TABLE booking_requests
  ADD COLUMN IF NOT EXISTS done_at timestamptz;

-- Lọc nhanh "còn việc chưa chốt" mà không quét cả bảng
CREATE INDEX IF NOT EXISTS idx_booking_requests_open_work
  ON booking_requests(board_id)
  WHERE done_at IS NULL;

COMMENT ON COLUMN booking_requests.is_marked IS
  'Người xếp lịch tự đánh dấu để quay lại sau; hiển thị đậm hơn trên lưới';
COMMENT ON COLUMN booking_requests.done_at IS
  'Lúc đóng dấu hoàn thành; NULL = chưa xong';

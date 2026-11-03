-- ========== 048_booking_activity_log.sql ==========
-- Nhật ký: ai làm gì, đổi cái gì, lúc nào trên một bảng đăng ký.
--
-- Lịch là thứ nhiều người cùng sửa — học viên tự đổi giờ, chủ trung tâm kéo
-- buổi sang chỗ khác, admin duyệt — nên khi một buổi "tự nhiên biến mất" thì
-- phải tra được ai làm. Không có nhật ký thì chỉ còn cách đoán.
--
-- Ghi cả tên lẫn id người làm (`actor_name` là BẢN SAO tại thời điểm đó): xóa
-- tài khoản hay đổi tên về sau không được làm sai lịch sử đã ghi.
--
-- `detail` để jsonb thay vì cột cố định: mỗi loại thao tác đổi thứ khác nhau
-- (giờ, màu, học viên, ghi chú), đẻ cột cho từng loại sẽ thành bảng toàn NULL.

CREATE TABLE IF NOT EXISTS booking_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid REFERENCES booking_boards(id) ON DELETE CASCADE,
  -- Người làm: hoặc là một người đăng ký (phiên công khai), hoặc tài khoản nội bộ
  actor_registrant_id uuid REFERENCES booking_registrants(id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  actor_name text,
  action text NOT NULL,
  target_id uuid,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_activity_board
  ON booking_activity_log(board_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_activity_target
  ON booking_activity_log(target_id);

COMMENT ON TABLE booking_activity_log IS
  'Nhật ký thao tác trên bảng đăng ký: tạo / sửa / hủy buổi, đổi màu, gỡ vào khu chờ';
COMMENT ON COLUMN booking_activity_log.detail IS
  'Chi tiết thay đổi dạng {truong: {tu, thanh}} hoặc dữ liệu kèm theo';

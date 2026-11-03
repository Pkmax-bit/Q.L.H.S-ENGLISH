-- ========== 049_booking_messages.sql ==========
-- Hộp chat giữa học viên và trung tâm, ngay trên trang đăng ký công khai.
--
-- Vì sao KHÔNG dùng hệ Messenger nội bộ có sẵn: hệ đó gắn với profiles (tài
-- khoản có mật khẩu), còn người đăng ký chỉ có số điện thoại. Nối vào sẽ phải
-- tạo profile giả cho từng người đăng ký hoặc nới quyền Messenger ra ngoài —
-- cả hai đều mở rộng vùng dữ liệu nội bộ ra link công khai.
--
-- Mỗi học viên MỘT luồng cho mỗi bảng: học viên chỉ thấy luồng của mình, số
-- được đánh dấu quản lý (047) thấy mọi luồng của bảng đó.
--
-- `sender` chỉ hai giá trị thay vì lưu id người gửi: phía trung tâm có thể là
-- người quản lý hoặc admin nội bộ, hiển thị ra vẫn là "Trung tâm" — ai gõ thì
-- tra ở booking_activity_log.

-- Trong DB đã sẵn một bảng booking_messages RỖNG, chỉ có id/board_id/
-- registrant_id/body/created_at (không có trong thư mục migrations này). Nên
-- viết kiểu bồi thêm: tạo nếu chưa có, rồi ADD COLUMN IF NOT EXISTS cho phần
-- thiếu. Chạy DROP rồi CREATE lại thì sẽ xóa mất dữ liệu của người khác nếu
-- bảng đó thật ra đang được dùng ở đâu đó.

CREATE TABLE IF NOT EXISTS booking_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES booking_boards(id) ON DELETE CASCADE,
  registrant_id uuid NOT NULL REFERENCES booking_registrants(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE booking_messages
  ADD COLUMN IF NOT EXISTS sender text NOT NULL DEFAULT 'student';
ALTER TABLE booking_messages
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Mặc định chỉ để thêm cột được vào bảng đã có dòng; từ giờ phải ghi rõ ai gửi
ALTER TABLE booking_messages ALTER COLUMN sender DROP DEFAULT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_messages_sender_check') THEN
    ALTER TABLE booking_messages
      ADD CONSTRAINT booking_messages_sender_check CHECK (sender IN ('student', 'center'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_messages_body_len') THEN
    ALTER TABLE booking_messages
      ADD CONSTRAINT booking_messages_body_len CHECK (char_length(body) BETWEEN 1 AND 2000);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_booking_messages_thread
  ON booking_messages(board_id, registrant_id, created_at);
-- Đếm tin chưa đọc của phía trung tâm mà không quét cả bảng
CREATE INDEX IF NOT EXISTS idx_booking_messages_unread
  ON booking_messages(board_id, sender)
  WHERE read_at IS NULL;

COMMENT ON TABLE booking_messages IS
  'Chat giữa người đăng ký và trung tâm trên trang /dk/<slug>, mỗi người một luồng';

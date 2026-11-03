-- ========== 041_booking_requests.sql ==========
-- Nguyện vọng giờ học: học viên bấm vào ô TRỐNG trên lưới giờ (giờ chưa có ca
-- nào) để báo "em muốn học giờ này". Trung tâm xem giờ nào nhiều người muốn rồi
-- mở ca thật.
--
-- Vì sao TÁCH khỏi booking_entries chứ không thêm một status mới:
-- booking_entries gắn với slot_id NOT NULL và sĩ số được hàm book_booking_slot
-- khóa hàng để đếm. Nguyện vọng thì KHÔNG có ca, KHÔNG giữ chỗ, KHÔNG có sĩ số.
-- Nhét chung bảng sẽ phải nới slot_id thành nullable và mọi câu đếm sĩ số đều
-- phải thêm điều kiện loại trừ — chỉ cần quên một chỗ là sĩ số sai.

CREATE TABLE IF NOT EXISTS booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES booking_boards(id) ON DELETE CASCADE,
  registrant_id uuid NOT NULL REFERENCES booking_registrants(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  note text,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_slot_id uuid REFERENCES booking_slots(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_requests_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  CONSTRAINT booking_requests_time_order CHECK (end_time > start_time)
);

-- Một người không gửi trùng nguyện vọng cho cùng một khung giờ.
-- Bản đã hủy / đã từ chối không chặn gửi lại.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_booking_request_open
  ON booking_requests(board_id, registrant_id, session_date, start_time)
  WHERE status IN ('pending', 'approved');

CREATE INDEX IF NOT EXISTS idx_booking_requests_board_status
  ON booking_requests(board_id, status);
CREATE INDEX IF NOT EXISTS idx_booking_requests_slotkey
  ON booking_requests(board_id, session_date, start_time);
CREATE INDEX IF NOT EXISTS idx_booking_requests_registrant
  ON booking_requests(registrant_id);

COMMENT ON TABLE booking_requests IS 'Nguyện vọng giờ học của người đăng ký — KHÔNG giữ chỗ, không ảnh hưởng sĩ số';
COMMENT ON COLUMN booking_requests.created_slot_id IS 'Ca học được mở ra từ nguyện vọng này, nếu admin đã duyệt và tạo ca';

ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;

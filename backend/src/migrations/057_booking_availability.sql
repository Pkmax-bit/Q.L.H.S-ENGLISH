-- ========== 057_booking_availability.sql ==========
-- KHUNG GIỜ CÓ THỂ HỌC của từng học viên — "em rảnh T5 từ 12h đến 15h".
--
-- Đây KHÔNG phải buổi học. Nó là RÀNG BUỘC: học viên khoanh vùng mình rảnh,
-- giáo viên nhìn các vùng đó chồng lên nhau rồi xếp buổi thật vào trong.
-- Vì vậy không có tiền, không có con dấu hoàn thành, không vào sổ Sheet.
--
-- Vì sao TÁCH khỏi booking_requests chứ không thêm một status:
-- booking_requests là một BUỔI HỌC — có giá, có dấu hoàn thành, vào sổ tiền,
-- và bị assertNoSelfOverlap cấm chồng nhau. Khung rảnh thì ngược hẳn: dài
-- hàng giờ, của nhiều người chồng lên nhau mới là chuyện bình thường (đó
-- chính là thứ cần nhìn), và chồng lên cả buổi đã xếp cũng không sao. Nhét
-- chung bảng thì mọi câu hỏi "buổi học" đều phải thêm điều kiện loại trừ, chỉ
-- quên một chỗ là tiền sai hoặc lịch sai.
--
-- desired_minutes = muốn học bao lâu TRONG khung này. Để NULL thì lúc sắp tự
-- động lấy độ dài mặc định của lần sắp đó. Có cột này mới xếp được một lượt
-- cho cả lớp mà mỗi em một độ dài buổi khác nhau.

CREATE TABLE IF NOT EXISTS booking_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES booking_boards(id) ON DELETE CASCADE,
  registrant_id uuid NOT NULL REFERENCES booking_registrants(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  desired_minutes integer,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_availability_time_order CHECK (end_time > start_time),
  CONSTRAINT booking_availability_minutes
    CHECK (desired_minutes IS NULL OR desired_minutes BETWEEN 5 AND 600)
);

-- Lấy cả bảng theo ngày là truy vấn duy nhất màn hình cần: vẽ chồng, và nạp
-- cho thuật toán sắp lịch
CREATE INDEX IF NOT EXISTS idx_booking_availability_day
  ON booking_availability(board_id, session_date, start_time);
CREATE INDEX IF NOT EXISTS idx_booking_availability_person
  ON booking_availability(registrant_id);

-- Một người không khoanh trùng y hệt một khung hai lần. Khoanh ĐÈ nhau thì
-- vẫn cho (gộp lại là việc của tầng dịch vụ), chỉ chặn bản sao đúng hệt.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_booking_availability
  ON booking_availability(board_id, registrant_id, session_date, start_time, end_time);

ALTER TABLE booking_availability ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE booking_availability IS
  'Khung giờ học viên có thể học — ràng buộc để xếp lịch, KHÔNG phải buổi học';
COMMENT ON COLUMN booking_availability.desired_minutes IS
  'Muốn học bao nhiêu phút trong khung này; NULL = lấy độ dài mặc định lúc sắp lịch';

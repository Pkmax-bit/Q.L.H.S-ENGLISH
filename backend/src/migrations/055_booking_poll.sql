-- ========== 055_booking_poll.sql ==========
-- Bình chọn trong chat của bảng đăng ký.
--
-- Một bình chọn LÀ một tin nhắn, không phải một thực thể riêng nằm ngoài
-- luồng: nó xuất hiện đúng chỗ trong mạch hội thoại, thừa luôn quyền xem của
-- luồng đó, và xóa tin là xóa bình chọn. Tách ra bảng độc lập thì phải chép
-- lại board_id + registrant_id và chép lại cả bộ kiểm quyền.
--
-- Vì sao PHƯƠNG ÁN để jsonb mà PHIẾU lại có bảng riêng:
-- phương án cố định từ lúc tạo, không ai truy vấn riêng lẻ, và lúc nào cũng
-- đọc kèm cả bình chọn — một bảng con chỉ thêm join mà không thêm thông tin.
-- Phiếu thì ngược lại: hai người bấm cùng lúc, jsonb sẽ đọc-sửa-ghi đè mất
-- một phiếu; còn phải biết AI đã bỏ phiếu nào để hiện và để đổi ý.

CREATE TABLE IF NOT EXISTS booking_message_polls (
  message_id uuid PRIMARY KEY REFERENCES booking_messages(id) ON DELETE CASCADE,
  question text NOT NULL,
  -- [{ "id": "a", "text": "19h thứ 3" }, ...]
  options jsonb NOT NULL,
  -- Chọn nhiều phương án cùng lúc hay chỉ một
  multi boolean NOT NULL DEFAULT false,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_poll_question_len CHECK (char_length(question) BETWEEN 1 AND 300),
  -- 2 tới 10 phương án: một phương án thì không phải bình chọn, quá mười thì
  -- cái danh sách dài hơn cả khung chat trên điện thoại
  CONSTRAINT booking_poll_options_count
    CHECK (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) BETWEEN 2 AND 10)
);

CREATE TABLE IF NOT EXISTS booking_poll_votes (
  message_id uuid NOT NULL REFERENCES booking_message_polls(message_id) ON DELETE CASCADE,
  registrant_id uuid NOT NULL REFERENCES booking_registrants(id) ON DELETE CASCADE,
  option_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, registrant_id, option_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_poll_votes_message
  ON booking_poll_votes(message_id);

ALTER TABLE booking_message_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_poll_votes ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE booking_message_polls IS
  'Bình chọn gắn vào một tin nhắn; quyền xem thừa từ luồng chat của tin đó';
COMMENT ON COLUMN booking_message_polls.closed_at IS
  'Lúc khóa bình chọn; NULL = còn bỏ phiếu được';
COMMENT ON TABLE booking_poll_votes IS
  'Phiếu của từng người; khóa chính ba cột nên đổi ý là xóa rồi chèn lại';

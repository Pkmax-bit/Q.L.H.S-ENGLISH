-- Chế độ thi mô phỏng cho TOEIC Listening: audio tự phát, có khoảng chờ tích đáp án rồi tự chuyển câu.
-- Khi listening_exam_mode = true, học sinh không thể tua audio / quay lại câu trước (giống thi thật).

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS listening_exam_mode BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS listening_answer_seconds INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS listening_part34_answer_seconds INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS listening_directions_seconds INTEGER NOT NULL DEFAULT 25;

COMMENT ON COLUMN assignments.listening_exam_mode IS 'TOEIC Listening: bật chế độ thi mô phỏng (autoplay + auto-next + khoá tương tác).';
COMMENT ON COLUMN assignments.listening_answer_seconds IS 'Số giây chờ HS chọn đáp án sau mỗi audio Part 1/2 (mặc định 5s).';
COMMENT ON COLUMN assignments.listening_part34_answer_seconds IS 'Số giây chờ HS chọn đáp án giữa các câu thuộc 1 nhóm Part 3/4 (mặc định 8s).';
COMMENT ON COLUMN assignments.listening_directions_seconds IS 'Số giây hiển thị phần Directions ở đầu mỗi part (mặc định 25s).';

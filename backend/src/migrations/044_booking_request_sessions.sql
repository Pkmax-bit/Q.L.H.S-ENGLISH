-- ========== 044_booking_request_sessions.sql ==========
-- Nguyện vọng ghi thêm "muốn học bao nhiêu buổi" ở khung giờ đó.
--
-- Học viên hiếm khi xin đúng một buổi: thường là "em muốn học T3 19:00, khóa 8
-- buổi". Không có con số này thì trung tâm nhìn danh sách nguyện vọng chỉ biết
-- giờ nào đông, không biết mở lớp bao nhiêu buổi là đủ.
--
-- Vì sao KHÔNG sinh sẵn N dòng nguyện vọng cho N buổi:
-- bảng chỉ phủ tối đa 6 tuần, mà học viên xin 8-12 buổi là bình thường. Sinh
-- dòng sẽ hoặc tràn ra ngoài phạm vi bảng, hoặc phải cắt bớt rồi báo sai số
-- liệu. Giữ một dòng kèm số buổi là trung thực với điều người ta nói.

ALTER TABLE booking_requests
  ADD COLUMN IF NOT EXISTS session_count smallint NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_requests_session_count_range'
  ) THEN
    ALTER TABLE booking_requests
      ADD CONSTRAINT booking_requests_session_count_range
      CHECK (session_count BETWEEN 1 AND 200);
  END IF;
END
$$;

COMMENT ON COLUMN booking_requests.session_count IS
  'Số buổi học viên muốn ở khung giờ này (vd khóa 8 buổi); 1 = chỉ xin một buổi';

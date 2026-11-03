-- ========== 045_booking_request_color.sql ==========
-- Màu hiển thị của một buổi đã đăng ký trên lưới giờ, do TRUNG TÂM đặt.
--
-- Học viên kéo chọn giờ rồi bấm đăng ký; buổi đó hiện thành một khối màu trên
-- thời khóa biểu. Trước đây mọi buổi đều hổ phách nên nhìn vào không phân biệt
-- được lớp nào với lớp nào. Admin tô màu để xếp lớp bằng mắt: ví dụ xanh =
-- lớp giao tiếp, tím = lớp TOEIC.
--
-- Vì sao cột nằm ở booking_requests chứ không suy ra từ người đăng ký:
-- màu của ca học (booking_slots) suy từ UUID người tạo (backend/src/utils/
-- bookingColors.js) vì ở đó màu chỉ để phân biệt ai mở ca. Còn màu ở đây là
-- quyết định xếp lớp của trung tâm, không suy được từ dữ liệu nào sẵn có —
-- phải lưu lại.
--
-- NULL = chưa đặt màu, frontend hiển thị hổ phách "đang chờ duyệt".
-- Danh sách màu khớp PALETTE ở backend/src/utils/bookingColors.js và
-- SLOT_COLORS ở frontend/src/lib/bookingUtils.js — thêm màu mới phải sửa cả ba.

ALTER TABLE booking_requests
  ADD COLUMN IF NOT EXISTS color text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_requests_color_check'
  ) THEN
    ALTER TABLE booking_requests
      ADD CONSTRAINT booking_requests_color_check
      CHECK (color IS NULL OR color IN (
        'teal', 'amber', 'violet', 'rose', 'sky', 'lime', 'orange', 'indigo', 'slate'
      ));
  END IF;
END
$$;

COMMENT ON COLUMN booking_requests.color IS
  'Màu khối buổi học trên lưới, do admin đặt; NULL = chưa đặt (hiển thị hổ phách)';

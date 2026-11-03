-- ========== 051_booking_request_bold.sql ==========
-- Dấu thứ ba: TÔ ĐẬM.
--
-- Tách khỏi `is_marked` (050) vì người xếp lịch dùng hai dấu cho hai việc khác
-- nhau: tô đậm để một buổi nổi bật giữa đám đông (ví dụ lớp quan trọng, học
-- viên cần chú ý), còn đánh dấu là cờ tạm "quay lại xử cái này sau". Gộp một
-- cột thì đánh dấu xong là mất chỗ ghi cái kia.

ALTER TABLE booking_requests
  ADD COLUMN IF NOT EXISTS is_bold boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN booking_requests.is_bold IS
  'Tô đậm buổi này trên lưới cho nổi bật; khác is_marked là cờ tạm của người xếp';

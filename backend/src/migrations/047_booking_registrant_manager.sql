-- ========== 047_booking_registrant_manager.sql ==========
-- Cờ "người quản lý" cho một số điện thoại trên trang đăng ký công khai.
--
-- Chủ trung tâm làm việc ngay trên link /dk/<slug> chứ không mở trang quản trị:
-- nhìn lưới, đổi màu học viên, kéo buổi sang giờ khác. Nhưng cổng vào trang đó
-- chỉ cần SỐ ĐIỆN THOẠI, không mật khẩu — nên quyền phải gắn vào đúng một số
-- cụ thể, không suy từ vai trò nào khác.
--
-- Cảnh báo đã nói rõ với chủ trung tâm khi bật: ai biết số này là vào xem được
-- cả danh sách lớp. Muốn chặt hơn thì phải thêm mã PIN, chưa làm ở bản này.
--
-- Backend KHÔNG tin cờ do client gửi: mọi API dành cho quản lý đều đọc lại cờ
-- từ bảng này theo registrant_id trong phiên.

ALTER TABLE booking_registrants
  ADD COLUMN IF NOT EXISTS is_manager boolean NOT NULL DEFAULT false;

-- Số của chủ trung tâm (Mai Huỳnh Anh Thi). Thêm/bớt người quản lý về sau thì
-- chạy UPDATE tương tự, không cần migration mới.
UPDATE booking_registrants
SET is_manager = true
WHERE phone = '0764829049';

CREATE INDEX IF NOT EXISTS idx_booking_registrants_manager
  ON booking_registrants(is_manager)
  WHERE is_manager;

COMMENT ON COLUMN booking_registrants.is_manager IS
  'Số điện thoại này vào /dk/<slug> thì thấy và sửa được buổi của mọi học viên';

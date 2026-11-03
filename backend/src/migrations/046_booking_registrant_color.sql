-- ========== 046_booking_registrant_color.sql ==========
-- Mỗi học viên MỘT màu cố định trên lưới giờ.
--
-- Trước đây màu nằm ở từng nguyện vọng (045): tô xong vẫn không biết hai khối
-- cùng màu là một người hay hai người. Gắn màu vào người thì nhìn thời khóa
-- biểu là nhận ra ngay ai học giờ nào, và người đó đăng ký thêm buổi mới cũng
-- tự ra đúng màu, không ai phải tô lại.
--
-- Cấp màu lúc tạo tài khoản, chọn màu ít người dùng nhất nên trong phạm vi 9
-- màu đầu tiên là không trùng. Quá 9 người thì buộc phải lặp — bảng màu
-- Tailwind chỉ có bấy nhiêu tông còn đọc được trên nền trắng — nhưng luôn rải
-- đều chứ không dồn vào một màu.
--
-- Cột color ở booking_requests (045) GIỮ NGUYÊN, không xóa: dữ liệu đã tô tay
-- còn đó, và còn chỗ để sau này muốn đè màu riêng cho một buổi lẻ.

ALTER TABLE booking_registrants
  ADD COLUMN IF NOT EXISTS color text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_registrants_color_check'
  ) THEN
    ALTER TABLE booking_registrants
      ADD CONSTRAINT booking_registrants_color_check
      CHECK (color IS NULL OR color IN (
        'teal', 'amber', 'violet', 'rose', 'sky', 'lime', 'orange', 'indigo', 'slate'
      ));
  END IF;
END
$$;

-- Người đã đăng ký từ trước: rải đều 9 màu theo thứ tự tạo tài khoản
WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) - 1 AS idx
  FROM booking_registrants
  WHERE color IS NULL
)
UPDATE booking_registrants r
SET color = (ARRAY[
  'teal', 'amber', 'violet', 'rose', 'sky', 'lime', 'orange', 'indigo', 'slate'
])[(ranked.idx % 9) + 1]
FROM ranked
WHERE r.id = ranked.id;

COMMENT ON COLUMN booking_registrants.color IS
  'Màu cố định của học viên trên lưới giờ, cấp tự động lúc tạo tài khoản';

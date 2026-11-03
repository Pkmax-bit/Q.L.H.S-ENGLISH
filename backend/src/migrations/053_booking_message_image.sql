-- ========== 053_booking_message_image.sql ==========
-- Gửi ảnh trong chat bảng đăng ký.
--
-- Ảnh để Supabase Storage, bảng chỉ giữ đường dẫn — giống cách ngân hàng câu
-- hỏi đang làm (questionBank.service.js). Nhét base64 vào cột text thì một tấm
-- ảnh điện thoại 3MB phình thành 4MB chữ, mỗi lần mở luồng chat là tải lại hết.
--
-- Giữ CẢ `image_path` lẫn `image_url`: url để hiển thị, path để còn xóa được
-- file trong kho khi xóa tin.
--
-- `body` phải cho phép rỗng: tin chỉ có ảnh, không kèm chữ, là chuyện thường.
-- Ràng buộc mới: phải có ÍT NHẤT một trong hai — chữ hoặc ảnh.

ALTER TABLE booking_messages
  ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE booking_messages
  ADD COLUMN IF NOT EXISTS image_path text;

ALTER TABLE booking_messages ALTER COLUMN body DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_messages_body_len') THEN
    ALTER TABLE booking_messages DROP CONSTRAINT booking_messages_body_len;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_messages_has_content') THEN
    ALTER TABLE booking_messages
      ADD CONSTRAINT booking_messages_has_content CHECK (
        (body IS NOT NULL AND char_length(body) BETWEEN 1 AND 2000)
        OR image_url IS NOT NULL
      );
  END IF;
END
$$;

COMMENT ON COLUMN booking_messages.image_url IS 'Link công khai của ảnh trong Supabase Storage';
COMMENT ON COLUMN booking_messages.image_path IS 'Đường dẫn trong bucket, dùng để xóa file khi xóa tin';

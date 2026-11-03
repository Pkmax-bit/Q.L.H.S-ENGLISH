-- ========== 056_booking_message_deleted.sql ==========
-- Thu hồi tin nhắn.
--
-- Đánh dấu ĐÃ XÓA chứ không xóa hẳn dòng, vì hai lý do:
--
-- 1. Tin bị trả lời: reply_to là ON DELETE SET NULL (052), xóa hẳn thì ô
--    trích dẫn ở tin trả lời biến mất không dấu vết — người đọc còn lại một
--    câu trả lời treo lơ lửng không biết trả lời cái gì.
-- 2. Phía bên kia đang mở hộp chat: tin tự nhiên bốc hơi giữa cuộc nói chuyện
--    thì người ta tưởng máy lỗi. "Tin nhắn đã được thu hồi" nói rõ chuyện gì
--    vừa xảy ra, đúng thói quen của mọi ứng dụng nhắn tin.
--
-- NỘI DUNG THÌ XÓA THẬT: body và image_url về NULL, file ảnh trong kho cũng
-- gỡ. Thu hồi mà chữ vẫn nằm trong database thì không phải là thu hồi.
-- Vì vậy phải nới ràng buộc "phải có chữ hoặc có ảnh" — tin đã thu hồi là
-- ngoại lệ duy nhất được rỗng cả hai.

ALTER TABLE booking_messages
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_messages_has_content') THEN
    ALTER TABLE booking_messages DROP CONSTRAINT booking_messages_has_content;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_messages_content_or_deleted') THEN
    ALTER TABLE booking_messages
      ADD CONSTRAINT booking_messages_content_or_deleted CHECK (
        deleted_at IS NOT NULL
        OR (body IS NOT NULL AND char_length(body) BETWEEN 1 AND 2000)
        OR image_url IS NOT NULL
      );
  END IF;
END
$$;

COMMENT ON COLUMN booking_messages.deleted_at IS
  'Lúc người gửi thu hồi tin; nội dung đã bị xóa, chỉ còn lại chỗ trống trong luồng';

-- ========== 016_tuition_transfer_image.sql ==========
-- Thêm cột lưu ảnh chuyển khoản (URL) cho tuition_payments

ALTER TABLE tuition_payments
  ADD COLUMN IF NOT EXISTS transfer_image_url TEXT;

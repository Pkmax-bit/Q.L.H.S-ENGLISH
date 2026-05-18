-- ========== 018_tuition_invoice_item_attachments.sql ==========
-- Ảnh chứng từ gắn với từng dòng chi tiết (không chỉ cấp hóa đơn)

ALTER TABLE tuition_invoice_items
  ADD COLUMN IF NOT EXISTS attachment_urls TEXT[] DEFAULT '{}';

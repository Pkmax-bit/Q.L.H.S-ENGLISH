  -- ========== 017_tuition_invoice_attachments_and_periods.sql ==========
  -- Cho phép 1 hóa đơn:
  --   1) Đính kèm nhiều ảnh chứng từ
  --   2) Bao gồm nhiều dòng học phí thuộc nhiều tháng khác nhau (mỗi item có period riêng)

  ALTER TABLE tuition_invoices
    ADD COLUMN IF NOT EXISTS attachment_urls TEXT[] DEFAULT '{}';

  ALTER TABLE tuition_invoice_items
    ADD COLUMN IF NOT EXISTS period_start DATE,
    ADD COLUMN IF NOT EXISTS period_end DATE;

  CREATE INDEX IF NOT EXISTS idx_tuition_invoice_items_period
    ON tuition_invoice_items(period_start, period_end);

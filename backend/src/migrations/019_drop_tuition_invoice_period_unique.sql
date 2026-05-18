-- ========== 019_drop_tuition_invoice_period_unique.sql ==========
-- Cho phép nhiều hóa đơn cùng học sinh / lớp / ngày bắt đầu kỳ (ví dụ tách đợt, bổ sung dòng).
-- Trùng tháng khi sinh hàng loạt vẫn được kiểm tra trong generateInvoicesForClass.

ALTER TABLE tuition_invoices
  DROP CONSTRAINT IF EXISTS tuition_invoices_student_id_class_id_period_start_key;

-- FK cho PostgREST embed trên tuition_invoices / tuition_payments
-- (bảng tạo từ 000_base_schema thiếu FK; 015 CREATE TABLE IF NOT EXISTS không bổ sung)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tuition_invoices_student_id_fkey'
  ) THEN
    ALTER TABLE tuition_invoices
      ADD CONSTRAINT tuition_invoices_student_id_fkey
      FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tuition_invoices_class_id_fkey'
  ) THEN
    ALTER TABLE tuition_invoices
      ADD CONSTRAINT tuition_invoices_class_id_fkey
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tuition_invoices_created_by_fkey'
  ) THEN
    ALTER TABLE tuition_invoices
      ADD CONSTRAINT tuition_invoices_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tuition_payments_invoice_id_fkey'
  ) THEN
    ALTER TABLE tuition_payments
      ADD CONSTRAINT tuition_payments_invoice_id_fkey
      FOREIGN KEY (invoice_id) REFERENCES tuition_invoices(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tuition_payments_collected_by_fkey'
  ) THEN
    ALTER TABLE tuition_payments
      ADD CONSTRAINT tuition_payments_collected_by_fkey
      FOREIGN KEY (collected_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tuition_invoice_items_invoice_id_fkey'
  ) THEN
    ALTER TABLE tuition_invoice_items
      ADD CONSTRAINT tuition_invoice_items_invoice_id_fkey
      FOREIGN KEY (invoice_id) REFERENCES tuition_invoices(id) ON DELETE CASCADE;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

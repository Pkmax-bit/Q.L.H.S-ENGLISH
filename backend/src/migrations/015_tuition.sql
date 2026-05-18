-- ========== 015_tuition.sql ==========
-- Tuition fee accounting: invoices, items, payments
-- Extends classes table with fee policy configuration

-- ----- 1. Extend classes with fee policy -----
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS fee_policy VARCHAR(20)
    CHECK (fee_policy IN ('per_class', 'monthly', 'per_session'));

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(12, 2) DEFAULT 0;

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS billing_day SMALLINT DEFAULT 1
    CHECK (billing_day BETWEEN 1 AND 28);

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS sessions_per_period SMALLINT DEFAULT 0;

-- ----- 2. tuition_invoices -----
CREATE TABLE IF NOT EXISTS tuition_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no VARCHAR(32) UNIQUE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  fee_policy VARCHAR(20) NOT NULL CHECK (fee_policy IN ('per_class', 'monthly', 'per_session')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'unpaid'
    CHECK (status IN ('unpaid', 'partial', 'paid', 'overdue', 'cancelled')),
  note TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (student_id, class_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_tuition_invoices_student ON tuition_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_tuition_invoices_class ON tuition_invoices(class_id);
CREATE INDEX IF NOT EXISTS idx_tuition_invoices_status ON tuition_invoices(status);
CREATE INDEX IF NOT EXISTS idx_tuition_invoices_period ON tuition_invoices(period_start, period_end);

-- Auto generate invoice_no like INV-202605-000001
CREATE SEQUENCE IF NOT EXISTS tuition_invoice_no_seq START 1;

CREATE OR REPLACE FUNCTION set_tuition_invoice_no() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_no IS NULL OR NEW.invoice_no = '' THEN
    NEW.invoice_no := 'INV-' || to_char(now(), 'YYYYMM') || '-' ||
                      lpad(nextval('tuition_invoice_no_seq')::text, 6, '0');
  END IF;
  NEW.balance := COALESCE(NEW.total, 0) - COALESCE(NEW.paid_amount, 0);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tuition_invoice_no ON tuition_invoices;
CREATE TRIGGER trg_tuition_invoice_no
  BEFORE INSERT OR UPDATE ON tuition_invoices
  FOR EACH ROW EXECUTE FUNCTION set_tuition_invoice_no();

-- ----- 3. tuition_invoice_items -----
CREATE TABLE IF NOT EXISTS tuition_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES tuition_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tuition_invoice_items_invoice ON tuition_invoice_items(invoice_id);

-- ----- 4. tuition_payments -----
CREATE TABLE IF NOT EXISTS tuition_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no VARCHAR(32) UNIQUE,
  invoice_id UUID NOT NULL REFERENCES tuition_invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(20) NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'other')),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  collected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  finance_id UUID REFERENCES finances(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tuition_payments_invoice ON tuition_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_tuition_payments_paid_at ON tuition_payments(paid_at);

CREATE SEQUENCE IF NOT EXISTS tuition_receipt_no_seq START 1;

CREATE OR REPLACE FUNCTION set_tuition_receipt_no() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receipt_no IS NULL OR NEW.receipt_no = '' THEN
    NEW.receipt_no := 'RC-' || to_char(now(), 'YYYYMM') || '-' ||
                      lpad(nextval('tuition_receipt_no_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tuition_receipt_no ON tuition_payments;
CREATE TRIGGER trg_tuition_receipt_no
  BEFORE INSERT ON tuition_payments
  FOR EACH ROW EXECUTE FUNCTION set_tuition_receipt_no();

-- ----- 5. Auto-update invoice paid_amount/status when payments change -----
CREATE OR REPLACE FUNCTION sync_invoice_from_payments() RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_total NUMERIC(12, 2);
  v_paid NUMERIC(12, 2);
  v_due DATE;
  v_status VARCHAR(20);
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  SELECT total, due_date INTO v_total, v_due
  FROM tuition_invoices WHERE id = v_invoice_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM tuition_payments WHERE invoice_id = v_invoice_id;

  IF v_paid >= v_total AND v_total > 0 THEN
    v_status := 'paid';
  ELSIF v_paid > 0 THEN
    v_status := 'partial';
  ELSIF v_due IS NOT NULL AND v_due < CURRENT_DATE THEN
    v_status := 'overdue';
  ELSE
    v_status := 'unpaid';
  END IF;

  UPDATE tuition_invoices
  SET paid_amount = v_paid,
      balance = COALESCE(total, 0) - v_paid,
      status = CASE WHEN status = 'cancelled' THEN 'cancelled' ELSE v_status END,
      updated_at = now()
  WHERE id = v_invoice_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_invoice_after_payment ON tuition_payments;
CREATE TRIGGER trg_sync_invoice_after_payment
  AFTER INSERT OR UPDATE OR DELETE ON tuition_payments
  FOR EACH ROW EXECUTE FUNCTION sync_invoice_from_payments();

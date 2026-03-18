CREATE TABLE finances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(10) NOT NULL CHECK (type IN ('income','expense')),
    category_id UUID REFERENCES finance_categories(id),
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    reference_type VARCHAR(50),
    reference_id UUID,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash','bank_transfer','card','other')),
    receipt_url VARCHAR(500),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_finances_type ON finances(type);
CREATE INDEX idx_finances_category ON finances(category_id);
CREATE INDEX idx_finances_date ON finances(payment_date);

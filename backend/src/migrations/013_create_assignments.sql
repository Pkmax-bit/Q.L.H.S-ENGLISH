CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    subject_id UUID REFERENCES subjects(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('essay','multiple_choice','mixed')),
    content TEXT,
    youtube_url VARCHAR(500),
    drive_url VARCHAR(500),
    total_points DECIMAL(5,2),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_assignments_subject ON assignments(subject_id);
CREATE INDEX idx_assignments_type ON assignments(type);

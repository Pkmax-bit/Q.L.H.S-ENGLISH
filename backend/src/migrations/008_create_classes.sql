CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subject_id UUID REFERENCES subjects(id),
    homeroom_teacher_id UUID REFERENCES teachers(id),
    max_students INTEGER DEFAULT 30,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
    start_date DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_classes_subject ON classes(subject_id);
CREATE INDEX idx_classes_teacher ON classes(homeroom_teacher_id);
CREATE INDEX idx_classes_status ON classes(status);

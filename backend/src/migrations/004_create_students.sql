CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('male','female','other')),
    phone VARCHAR(20),
    parent_phone VARCHAR(20),
    parent_name VARCHAR(255),
    email VARCHAR(255),
    address TEXT,
    enrollment_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','graduated','dropped')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_name ON students(full_name);

-- ========== 000_extensions.sql ==========
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ========== 001_create_users.sql ==========
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher')),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);


-- ========== 002_create_refresh_tokens.sql ==========
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    device_info VARCHAR(255),
    ip_address VARCHAR(45),
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);


-- ========== 003_create_teachers.sql ==========
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    specialization VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','on_leave')),
    salary DECIMAL(15,2),
    hire_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(status);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);


-- ========== 004_create_students.sql ==========
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


-- ========== 005_create_subjects.sql ==========
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_subjects_code ON subjects(code);


-- ========== 006_create_facilities.sql ==========
CREATE TABLE facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


-- ========== 007_create_rooms.sql ==========
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    capacity INTEGER,
    equipment TEXT,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available','occupied','maintenance')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_rooms_facility ON rooms(facility_id);
CREATE INDEX idx_rooms_status ON rooms(status);


-- ========== 008_create_classes.sql ==========
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


-- ========== 009_create_class_students.sql ==========
CREATE TABLE class_students (
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (class_id, student_id)
);
CREATE INDEX idx_class_students_student ON class_students(student_id);


-- ========== 010_create_class_teachers.sql ==========
CREATE TABLE class_teachers (
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'instructor',
    PRIMARY KEY (class_id, teacher_id)
);
CREATE INDEX idx_class_teachers_teacher ON class_teachers(teacher_id);


-- ========== 011_create_lessons.sql ==========
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    subject_id UUID REFERENCES subjects(id),
    content TEXT,
    youtube_url VARCHAR(500),
    drive_url VARCHAR(500),
    order_index INTEGER,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_lessons_subject ON lessons(subject_id);


-- ========== 012_create_lesson_attachments.sql ==========
CREATE TABLE lesson_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    uploaded_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_lesson_attachments_lesson ON lesson_attachments(lesson_id);


-- ========== 013_create_assignments.sql ==========
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


-- ========== 014_create_assignment_questions.sql ==========
CREATE TABLE assignment_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('essay','multiple_choice')),
    points DECIMAL(5,2),
    order_index INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_assignment_questions_assignment ON assignment_questions(assignment_id);


-- ========== 015_create_question_options.sql ==========
CREATE TABLE question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES assignment_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    order_index INTEGER
);
CREATE INDEX idx_question_options_question ON question_options(question_id);


-- ========== 016_create_assignment_attachments.sql ==========
CREATE TABLE assignment_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    file_name VARCHAR(255),
    file_url VARCHAR(500),
    file_type VARCHAR(50),
    file_size INTEGER,
    uploaded_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_assignment_attachments_assignment ON assignment_attachments(assignment_id);


-- ========== 017_create_schedules.sql ==========
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    name VARCHAR(255),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_schedules_class ON schedules(class_id);


-- ========== 018_create_schedule_slots.sql ==========
CREATE TABLE schedule_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id),
    room_id UUID REFERENCES rooms(id),
    subject_id UUID REFERENCES subjects(id),
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    recurrence VARCHAR(10) DEFAULT 'weekly' CHECK (recurrence IN ('weekly','once')),
    specific_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_schedule_slots_schedule ON schedule_slots(schedule_id);
CREATE INDEX idx_schedule_slots_teacher ON schedule_slots(teacher_id);
CREATE INDEX idx_schedule_slots_room ON schedule_slots(room_id);


-- ========== 019_create_finance_categories.sql ==========
CREATE TABLE finance_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income','expense')),
    description TEXT,
    is_active BOOLEAN DEFAULT true
);


-- ========== 020_create_finances.sql ==========
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



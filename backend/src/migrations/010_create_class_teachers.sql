CREATE TABLE class_teachers (
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'instructor',
    PRIMARY KEY (class_id, teacher_id)
);
CREATE INDEX idx_class_teachers_teacher ON class_teachers(teacher_id);

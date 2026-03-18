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

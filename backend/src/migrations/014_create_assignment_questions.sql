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

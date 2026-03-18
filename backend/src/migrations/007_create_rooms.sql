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

-- ========== Add date range to schedules ==========
-- Schedules now have start_date and end_date to limit recurring display range.

ALTER TABLE schedules ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS end_date DATE;

CREATE INDEX IF NOT EXISTS idx_schedules_date_range ON schedules(start_date, end_date);

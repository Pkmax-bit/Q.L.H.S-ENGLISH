-- FK schedules → classes, facilities (PostgREST embed + toàn vẹn dữ liệu)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'schedules_class_id_fkey'
  ) THEN
    ALTER TABLE schedules
      ADD CONSTRAINT schedules_class_id_fkey
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'schedules_room_id_fkey'
  ) THEN
    ALTER TABLE schedules
      ADD CONSTRAINT schedules_room_id_fkey
      FOREIGN KEY (room_id) REFERENCES facilities(id) ON DELETE SET NULL;
  END IF;
END $$;

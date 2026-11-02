-- ========== 038_booking_board.sql ==========
-- Bảng đăng ký lịch học công khai: giữ chỗ theo ca, phạm vi mỗi bảng là 1 tuần.
-- Người đăng ký chỉ cần họ tên + SĐT, lưu ở bảng riêng — KHÔNG đụng profiles,
-- không ảnh hưởng học phí / điểm danh / lớp học hiện có.

-- ---------- Bảng đăng ký (mỗi bảng = 1 tuần) ----------
CREATE TABLE IF NOT EXISTS booking_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  week_start date NOT NULL,
  is_open boolean NOT NULL DEFAULT true,
  opens_at timestamptz,
  closes_at timestamptz,
  max_slots_per_person smallint NOT NULL DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_boards_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{2,63}$'),
  CONSTRAINT booking_boards_person_limit CHECK (max_slots_per_person >= 0),
  -- week_start luôn là thứ 2 để lưới 7 cột không bị lệch
  CONSTRAINT booking_boards_week_start_monday CHECK (EXTRACT(ISODOW FROM week_start) = 1)
);

COMMENT ON TABLE booking_boards IS 'Bảng đăng ký lịch học công khai, mỗi bảng phụ trách 1 tuần';
COMMENT ON COLUMN booking_boards.slug IS 'Mã trong link công khai: /dk/<slug>';
COMMENT ON COLUMN booking_boards.max_slots_per_person IS '0 = không giới hạn số ca mỗi người giữ trong bảng';

-- ---------- Các ca học trong bảng ----------
CREATE TABLE IF NOT EXISTS booking_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES booking_boards(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  label text,
  teacher_name text,
  room_name text,
  capacity smallint NOT NULL DEFAULT 10,
  allow_waitlist boolean NOT NULL DEFAULT false,
  note text,
  is_active boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- 0 = Chủ nhật ... 6 = Thứ 7, đúng quy ước bảng schedules hiện có
  CONSTRAINT booking_slots_day_range CHECK (day_of_week BETWEEN 0 AND 6),
  CONSTRAINT booking_slots_capacity_positive CHECK (capacity > 0),
  CONSTRAINT booking_slots_time_order CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_booking_slots_board
  ON booking_slots(board_id, day_of_week, start_time);

COMMENT ON COLUMN booking_slots.day_of_week IS '0=CN, 1=T2 ... 6=T7 (cùng quy ước với schedules.day_of_week)';

-- ---------- Người đăng ký (chỉ thông tin cơ bản) ----------
CREATE TABLE IF NOT EXISTS booking_registrants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  full_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  CONSTRAINT booking_registrants_phone_format CHECK (phone ~ '^0[0-9]{8,10}$'),
  CONSTRAINT booking_registrants_name_not_blank CHECK (btrim(full_name) <> '')
);

COMMENT ON TABLE booking_registrants IS 'Người đăng ký lịch học qua trang công khai; phone đã chuẩn hóa về dạng 0xxxxxxxxx';

-- ---------- Một người giữ một ca ----------
CREATE TABLE IF NOT EXISTS booking_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES booking_boards(id) ON DELETE CASCADE,
  slot_id uuid NOT NULL REFERENCES booking_slots(id) ON DELETE CASCADE,
  registrant_id uuid NOT NULL REFERENCES booking_registrants(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  CONSTRAINT booking_entries_status_check CHECK (status IN ('confirmed', 'waitlist', 'cancelled'))
);

-- Không giữ trùng một ca; bản ghi đã hủy không chặn đăng ký lại
CREATE UNIQUE INDEX IF NOT EXISTS uniq_booking_entry_active
  ON booking_entries(slot_id, registrant_id)
  WHERE status <> 'cancelled';

CREATE INDEX IF NOT EXISTS idx_booking_entries_slot
  ON booking_entries(slot_id, status);
CREATE INDEX IF NOT EXISTS idx_booking_entries_board_registrant
  ON booking_entries(board_id, registrant_id);

-- ---------- Giữ chỗ: khóa hàng ca để không vượt sĩ số ----------
-- Nếu đếm ở tầng Node rồi mới chèn, hai người bấm cùng lúc sẽ cùng thấy "còn chỗ"
-- và ca bị vượt sĩ số. SELECT ... FOR UPDATE buộc các yêu cầu cùng ca xếp hàng.
CREATE OR REPLACE FUNCTION public.book_booking_slot(p_slot_id uuid, p_registrant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_slot      booking_slots%ROWTYPE;
  v_board     booking_boards%ROWTYPE;
  v_existing  booking_entries%ROWTYPE;
  v_entry     booking_entries%ROWTYPE;
  v_taken     integer;
  v_mine      integer;
  v_status    text;
BEGIN
  SELECT * INTO v_slot FROM booking_slots WHERE id = p_slot_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'slot_not_found');
  END IF;
  IF NOT v_slot.is_active THEN
    RETURN jsonb_build_object('ok', false, 'code', 'slot_inactive');
  END IF;

  SELECT * INTO v_board FROM booking_boards WHERE id = v_slot.board_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'board_not_found');
  END IF;
  IF NOT v_board.is_open
     OR (v_board.opens_at IS NOT NULL AND now() < v_board.opens_at)
     OR (v_board.closes_at IS NOT NULL AND now() > v_board.closes_at) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'board_closed');
  END IF;

  SELECT * INTO v_existing FROM booking_entries
   WHERE slot_id = p_slot_id
     AND registrant_id = p_registrant_id
     AND status <> 'cancelled';
  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true, 'code', 'already_booked',
      'status', v_existing.status, 'entry_id', v_existing.id
    );
  END IF;

  IF v_board.max_slots_per_person > 0 THEN
    SELECT count(*) INTO v_mine FROM booking_entries
     WHERE board_id = v_board.id
       AND registrant_id = p_registrant_id
       AND status <> 'cancelled';
    IF v_mine >= v_board.max_slots_per_person THEN
      RETURN jsonb_build_object(
        'ok', false, 'code', 'person_limit_reached',
        'limit', v_board.max_slots_per_person
      );
    END IF;
  END IF;

  SELECT count(*) INTO v_taken FROM booking_entries
   WHERE slot_id = p_slot_id AND status = 'confirmed';

  IF v_taken < v_slot.capacity THEN
    v_status := 'confirmed';
  ELSIF v_slot.allow_waitlist THEN
    v_status := 'waitlist';
  ELSE
    RETURN jsonb_build_object('ok', false, 'code', 'slot_full');
  END IF;

  INSERT INTO booking_entries (board_id, slot_id, registrant_id, status)
  VALUES (v_board.id, p_slot_id, p_registrant_id, v_status)
  RETURNING * INTO v_entry;

  RETURN jsonb_build_object(
    'ok', true, 'code', 'booked',
    'status', v_status, 'entry_id', v_entry.id
  );
END;
$fn$;

-- ---------- Hủy chỗ: tự đẩy người đầu hàng chờ lên ----------
-- p_registrant_id NULL = admin hủy hộ, bỏ qua kiểm tra chủ sở hữu.
CREATE OR REPLACE FUNCTION public.cancel_booking_entry(
  p_entry_id uuid,
  p_registrant_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_entry     booking_entries%ROWTYPE;
  v_slot      booking_slots%ROWTYPE;
  v_promoted  booking_entries%ROWTYPE;
  v_was       text;
BEGIN
  SELECT * INTO v_entry FROM booking_entries WHERE id = p_entry_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'entry_not_found');
  END IF;
  IF p_registrant_id IS NOT NULL AND v_entry.registrant_id <> p_registrant_id THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_owner');
  END IF;
  IF v_entry.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', true, 'code', 'already_cancelled');
  END IF;

  -- Khóa cùng hàng ca mà book_booking_slot khóa, để hủy và giữ chỗ không chen nhau
  SELECT * INTO v_slot FROM booking_slots WHERE id = v_entry.slot_id FOR UPDATE;

  v_was := v_entry.status;

  UPDATE booking_entries
     SET status = 'cancelled', cancelled_at = now()
   WHERE id = p_entry_id;

  IF v_was = 'confirmed' THEN
    SELECT * INTO v_promoted FROM booking_entries
     WHERE slot_id = v_entry.slot_id AND status = 'waitlist'
     ORDER BY created_at ASC
     LIMIT 1;
    IF FOUND THEN
      UPDATE booking_entries SET status = 'confirmed' WHERE id = v_promoted.id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'code', 'cancelled',
    'promoted_entry_id', v_promoted.id
  );
END;
$fn$;

-- Chỉ backend (service role) được gọi; anon/authenticated qua PostgREST thì không
REVOKE EXECUTE ON FUNCTION public.book_booking_slot(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.book_booking_slot(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.book_booking_slot(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.book_booking_slot(uuid, uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.cancel_booking_entry(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_booking_entry(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_booking_entry(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking_entry(uuid, uuid) TO service_role;

-- RLS bật, không policy: anon/authenticated bị từ chối, service role đi thẳng.
-- Giống posture đã ghi ở 030_rls_posture_note.sql.
ALTER TABLE booking_boards      ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_slots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_registrants ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_entries     ENABLE ROW LEVEL SECURITY;

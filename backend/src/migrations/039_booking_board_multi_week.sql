-- ========== 039_booking_board_multi_week.sql ==========
-- Một bảng đăng ký trải nhiều tuần (tối đa 6 tuần = trọn một tháng).
-- Trung tâm gửi MỘT link cho cả tháng, học viên bấm chuyển tuần ngay trên trang.
--
-- Thay đổi cốt lõi: trước đây ngày của một lượt giữ chỗ được SUY RA từ
-- (board.week_start + slot.day_of_week) nên mỗi bảng chỉ ứng với đúng một tuần.
-- Giờ mỗi lượt giữ chỗ ghi thẳng session_date, nên cùng một ca (vd "T2 18:00")
-- có sĩ số TÍNH RIÊNG cho từng tuần.

-- ---------- Bảng: số tuần phụ trách ----------
ALTER TABLE booking_boards ADD COLUMN IF NOT EXISTS week_count smallint NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_boards_week_count_range'
  ) THEN
    ALTER TABLE booking_boards
      ADD CONSTRAINT booking_boards_week_count_range CHECK (week_count BETWEEN 1 AND 6);
  END IF;
END
$$;

COMMENT ON COLUMN booking_boards.week_count IS 'Số tuần bảng này phụ trách, tính từ week_start (1 = chỉ một tuần)';
COMMENT ON COLUMN booking_boards.max_slots_per_person IS 'Số ca tối đa mỗi người giữ MỖI TUẦN (0 = không giới hạn)';

-- ---------- Lượt giữ chỗ: ghi ngày cụ thể ----------
ALTER TABLE booking_entries ADD COLUMN IF NOT EXISTS session_date date;

-- Suy ngược ngày cho dữ liệu cũ: bảng cũ chỉ có 1 tuần nên ngày là duy nhất.
UPDATE booking_entries e
   SET session_date = b.week_start + (CASE WHEN s.day_of_week = 0 THEN 6 ELSE s.day_of_week - 1 END)
  FROM booking_slots s
  JOIN booking_boards b ON b.id = s.board_id
 WHERE e.slot_id = s.id
   AND e.session_date IS NULL;

ALTER TABLE booking_entries ALTER COLUMN session_date SET NOT NULL;

COMMENT ON COLUMN booking_entries.session_date IS 'Ngày thật của buổi học đã giữ chỗ; sĩ số tính theo (slot_id, session_date)';

-- Không giữ trùng một ca TRONG CÙNG MỘT NGÀY (trước đây là trùng ca bất kể tuần)
DROP INDEX IF EXISTS uniq_booking_entry_active;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_booking_entry_active
  ON booking_entries(slot_id, registrant_id, session_date)
  WHERE status <> 'cancelled';

CREATE INDEX IF NOT EXISTS idx_booking_entries_slot_date
  ON booking_entries(slot_id, session_date, status);
CREATE INDEX IF NOT EXISTS idx_booking_entries_board_date
  ON booking_entries(board_id, session_date);

-- ---------- Giữ chỗ: nay cần ngày cụ thể ----------
-- Phải DROP bản 2 tham số: để lại sẽ thành overload, gọi nhầm là chèn thiếu
-- session_date và vi phạm NOT NULL.
DROP FUNCTION IF EXISTS public.book_booking_slot(uuid, uuid);

CREATE OR REPLACE FUNCTION public.book_booking_slot(
  p_slot_id uuid,
  p_registrant_id uuid,
  p_session_date date
)
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
  v_last_day  date;
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

  -- Ngày phải đúng thứ của ca. EXTRACT(DOW) trả 0=CN..6=T7, trùng đúng quy ước
  -- booking_slots.day_of_week nên so sánh thẳng được.
  IF EXTRACT(DOW FROM p_session_date)::smallint <> v_slot.day_of_week THEN
    RETURN jsonb_build_object('ok', false, 'code', 'date_day_mismatch');
  END IF;

  -- Ngày phải nằm trong phạm vi tuần bảng phụ trách
  v_last_day := v_board.week_start + (v_board.week_count * 7 - 1);
  IF p_session_date < v_board.week_start OR p_session_date > v_last_day THEN
    RETURN jsonb_build_object('ok', false, 'code', 'date_out_of_range');
  END IF;

  SELECT * INTO v_existing FROM booking_entries
   WHERE slot_id = p_slot_id
     AND registrant_id = p_registrant_id
     AND session_date = p_session_date
     AND status <> 'cancelled';
  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true, 'code', 'already_booked',
      'status', v_existing.status, 'entry_id', v_existing.id
    );
  END IF;

  -- Giới hạn tính THEO TUẦN, không theo cả bảng: bảng giờ có thể dài một tháng,
  -- giới hạn theo bảng sẽ thành "2 ca cho cả tháng" — vô lý.
  IF v_board.max_slots_per_person > 0 THEN
    SELECT count(*) INTO v_mine FROM booking_entries
     WHERE board_id = v_board.id
       AND registrant_id = p_registrant_id
       AND status <> 'cancelled'
       AND date_trunc('week', session_date) = date_trunc('week', p_session_date);
    IF v_mine >= v_board.max_slots_per_person THEN
      RETURN jsonb_build_object(
        'ok', false, 'code', 'person_limit_reached',
        'limit', v_board.max_slots_per_person
      );
    END IF;
  END IF;

  SELECT count(*) INTO v_taken FROM booking_entries
   WHERE slot_id = p_slot_id
     AND session_date = p_session_date
     AND status = 'confirmed';

  IF v_taken < v_slot.capacity THEN
    v_status := 'confirmed';
  ELSIF v_slot.allow_waitlist THEN
    v_status := 'waitlist';
  ELSE
    RETURN jsonb_build_object('ok', false, 'code', 'slot_full');
  END IF;

  INSERT INTO booking_entries (board_id, slot_id, registrant_id, session_date, status)
  VALUES (v_board.id, p_slot_id, p_registrant_id, p_session_date, v_status)
  RETURNING * INTO v_entry;

  RETURN jsonb_build_object(
    'ok', true, 'code', 'booked',
    'status', v_status, 'entry_id', v_entry.id,
    'session_date', v_entry.session_date
  );
END;
$fn$;

-- ---------- Hủy chỗ: đẩy hàng chờ CỦA ĐÚNG NGÀY ĐÓ ----------
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

  SELECT * INTO v_slot FROM booking_slots WHERE id = v_entry.slot_id FOR UPDATE;

  v_was := v_entry.status;

  UPDATE booking_entries
     SET status = 'cancelled', cancelled_at = now()
   WHERE id = p_entry_id;

  IF v_was = 'confirmed' THEN
    -- Chỉ đẩy người chờ CÙNG NGÀY; hàng chờ tuần khác không liên quan
    SELECT * INTO v_promoted FROM booking_entries
     WHERE slot_id = v_entry.slot_id
       AND session_date = v_entry.session_date
       AND status = 'waitlist'
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

REVOKE EXECUTE ON FUNCTION public.book_booking_slot(uuid, uuid, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.book_booking_slot(uuid, uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.book_booking_slot(uuid, uuid, date) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.book_booking_slot(uuid, uuid, date) TO service_role;

REVOKE EXECUTE ON FUNCTION public.cancel_booking_entry(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_booking_entry(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_booking_entry(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking_entry(uuid, uuid) TO service_role;

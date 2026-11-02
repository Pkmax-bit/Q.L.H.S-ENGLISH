-- ========== 040_booking_slot_owner.sql ==========
-- Ghi lại ai tạo từng ca học, để tô màu theo người tạo.
--
-- Vì sao phải đặt ở booking_slots chứ không dùng booking_boards.created_by:
-- một bảng có thể do nhiều giáo viên cùng xếp ca (cô Lan thêm ca giao tiếp,
-- thầy Nam thêm ca TOEIC). Nếu màu lấy theo người tạo BẢNG thì cả lưới chỉ có
-- đúng một màu — không phân biệt được ca của ai.

ALTER TABLE booking_slots
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Ca đã có từ trước: coi như của người tạo bảng
UPDATE booking_slots s
   SET created_by = b.created_by
  FROM booking_boards b
 WHERE s.board_id = b.id
   AND s.created_by IS NULL
   AND b.created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_booking_slots_created_by
  ON booking_slots(created_by);

COMMENT ON COLUMN booking_slots.created_by IS 'Tài khoản đã tạo ca này; màu hiển thị của ca suy ra từ đây';

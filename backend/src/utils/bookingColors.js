/**
 * Màu hiển thị của một ca học, suy từ người tạo ca.
 *
 * Không thêm cột màu vào profiles: profiles là bảng dùng chung cho toàn hệ
 * thống, thêm cột chỉ phục vụ một màn hình là nợ kỹ thuật. Màu suy ra từ UUID
 * nên ổn định ở mọi nơi mà không cần ai cấu hình.
 */

// Chỉ trả về KHÓA màu; lớp CSS thật nằm ở frontend. Backend không nên biết
// tên class Tailwind — đổi giao diện sẽ phải sửa cả hai nơi.
const PALETTE = ['teal', 'amber', 'violet', 'rose', 'sky', 'lime', 'orange', 'indigo'];

/** Hash ổn định từ chuỗi UUID -> chỉ số trong bảng màu. */
const hashIndex = (value) => {
  const s = String(value || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h % PALETTE.length;
};

/**
 * Gán màu cho từng người tạo trong phạm vi MỘT bảng.
 *
 * Ưu tiên màu theo hash để một người giữ nguyên màu giữa các bảng. Nhưng trong
 * cùng một bảng mà hai người trùng màu thì không phân biệt được ai với ai, nên
 * người sau bị đẩy sang màu trống kế tiếp.
 */
const assignColors = (creatorIds = []) => {
  const unique = [...new Set(creatorIds.filter(Boolean))].sort();
  const used = new Set();
  const map = new Map();

  for (const id of unique) {
    let idx = hashIndex(id);
    for (let step = 0; step < PALETTE.length && used.has(PALETTE[idx]); step += 1) {
      idx = (idx + 1) % PALETTE.length;
    }
    const color = PALETTE[idx];
    used.add(color);
    map.set(id, color);
  }

  return map;
};

/** Ca không rõ người tạo (dữ liệu cũ, hoặc tài khoản đã xóa) */
const DEFAULT_COLOR = 'slate';

module.exports = { PALETTE, DEFAULT_COLOR, assignColors, hashIndex };

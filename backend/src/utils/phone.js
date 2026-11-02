/**
 * Chuẩn hóa số điện thoại Việt Nam về một dạng duy nhất: 0xxxxxxxxx.
 *
 * Người dùng gõ đủ kiểu — "0912 345 678", "+84912345678", "84.912.345.678",
 * "(091) 234-5678" — nếu không quy về một dạng thì cùng một người sẽ sinh
 * nhiều bản ghi booking_registrants khác nhau và "lần sau chỉ nhập SĐT" hỏng.
 */
const normalizePhone = (raw) => {
  let s = String(raw ?? '').trim();
  if (!s) return null;

  // Bỏ khoảng trắng, dấu chấm, gạch, ngoặc
  s = s.replace(/[\s.\-()]/g, '');

  // Quy các tiền tố quốc tế về 0
  if (s.startsWith('+84')) s = `0${s.slice(3)}`;
  else if (s.startsWith('0084')) s = `0${s.slice(4)}`;
  else if (s.startsWith('84') && s.length >= 11) s = `0${s.slice(2)}`;

  if (!/^\d+$/.test(s)) return null;

  // Thiếu số 0 đầu (vd gõ "912345678")
  if (!s.startsWith('0')) s = `0${s}`;

  return s;
};

/** Di động 10 số, hoặc cố định 10–11 số. Khớp CHECK constraint của booking_registrants. */
const isValidPhone = (phone) => /^0\d{9,10}$/.test(phone || '');

/**
 * Tên hiển thị công khai trên bảng chung: giữ họ và tên đệm, viết tắt tên gọi.
 * "Nguyễn Văn An" -> "Nguyễn Văn A."
 * Tên một chữ thì để nguyên, viết tắt sẽ thành vô nghĩa.
 */
const maskName = (fullName) => {
  const parts = String(fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Ẩn danh';
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  return `${parts.slice(0, -1).join(' ')} ${last.charAt(0)}.`;
};

/** Che SĐT khi buộc phải hiện cho người ngoài: 0912345678 -> 0912***678 */
const maskPhone = (phone) => {
  const s = String(phone ?? '');
  if (s.length < 7) return '***';
  return `${s.slice(0, 4)}***${s.slice(-3)}`;
};

module.exports = { normalizePhone, isValidPhone, maskName, maskPhone };

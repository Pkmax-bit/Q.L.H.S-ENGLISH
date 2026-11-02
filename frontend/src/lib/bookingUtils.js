// 0 = CN ... 6 = T7, cùng quy ước với schedules.day_of_week ở backend
export const DAY_LABELS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
export const DAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

// Thứ tự hiển thị lưới: T2 -> CN (CN đứng cuối, quen mắt người Việt)
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

/** '2026-11-02' -> '02/11' */
export const formatShortDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return `${d}/${m}`
}

/** '2026-11-02' -> '02/11/2026' */
export const formatDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export const formatDateTime = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Thứ 2 của tuần chứa ngày đó, dạng YYYY-MM-DD (khớp CHECK của booking_boards). */
export const mondayOf = (date = new Date()) => {
  const d = new Date(date)
  const dow = d.getDay()
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const addDaysIso = (iso, days) => {
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const isPastDate = (iso) => {
  if (!iso) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(`${String(iso).slice(0, 10)}T00:00:00`) < today
}

// ---- Buổi trong ngày ----
// Suy từ start_time, KHÔNG lưu cột riêng: một ca 09:00 luôn là buổi sáng, không
// có trường hợp nào cần người dùng tự chọn, nên thêm cột chỉ tạo chỗ sai lệch.
// Có 'Tối' vì trung tâm xếp nhiều ca 18:00+ — gộp vào 'Chiều' sẽ hiển thị sai.
export const TIME_BANDS = [
  { key: 'sang', label: 'Sáng', startMin: 0, endMin: 12 * 60 },
  { key: 'trua', label: 'Trưa', startMin: 12 * 60, endMin: 14 * 60 },
  { key: 'chieu', label: 'Chiều', startMin: 14 * 60, endMin: 18 * 60 },
  { key: 'toi', label: 'Tối', startMin: 18 * 60, endMin: 24 * 60 },
]

/** 'HH:MM' -> số phút từ nửa đêm */
export const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':')
  return (Number(h) || 0) * 60 + (Number(m) || 0)
}

/** Trả về buổi của một ca theo giờ bắt đầu */
export const bandOf = (startTime) => {
  const min = toMinutes(startTime)
  return TIME_BANDS.find((b) => min >= b.startMin && min < b.endMin) || TIME_BANDS[TIME_BANDS.length - 1]
}

// ---- Bảng màu theo người tạo ca ----
// Phải liệt kê class đầy đủ dạng tĩnh: Tailwind quét mã nguồn theo chuỗi, ghép
// động kiểu `border-${color}-300` sẽ không sinh ra CSS và màu biến mất lúc build.
export const SLOT_COLORS = {
  teal:   { dot: 'bg-teal-500',   border: 'border-teal-300',   bg: 'bg-teal-50/60',   text: 'text-teal-700',   chip: 'bg-teal-100 text-teal-800' },
  amber:  { dot: 'bg-amber-500',  border: 'border-amber-300',  bg: 'bg-amber-50/60',  text: 'text-amber-700',  chip: 'bg-amber-100 text-amber-800' },
  violet: { dot: 'bg-violet-500', border: 'border-violet-300', bg: 'bg-violet-50/60', text: 'text-violet-700', chip: 'bg-violet-100 text-violet-800' },
  rose:   { dot: 'bg-rose-500',   border: 'border-rose-300',   bg: 'bg-rose-50/60',   text: 'text-rose-700',   chip: 'bg-rose-100 text-rose-800' },
  sky:    { dot: 'bg-sky-500',    border: 'border-sky-300',    bg: 'bg-sky-50/60',    text: 'text-sky-700',    chip: 'bg-sky-100 text-sky-800' },
  lime:   { dot: 'bg-lime-500',   border: 'border-lime-300',   bg: 'bg-lime-50/60',   text: 'text-lime-700',   chip: 'bg-lime-100 text-lime-800' },
  orange: { dot: 'bg-orange-500', border: 'border-orange-300', bg: 'bg-orange-50/60', text: 'text-orange-700', chip: 'bg-orange-100 text-orange-800' },
  indigo: { dot: 'bg-indigo-500', border: 'border-indigo-300', bg: 'bg-indigo-50/60', text: 'text-indigo-700', chip: 'bg-indigo-100 text-indigo-800' },
  slate:  { dot: 'bg-slate-400',  border: 'border-slate-200',  bg: 'bg-white',        text: 'text-slate-600',  chip: 'bg-slate-100 text-slate-700' },
}

export const colorClasses = (key) => SLOT_COLORS[key] || SLOT_COLORS.slate

// ---- Bước chia lưới giờ ----
// 60 phút = mỗi ô một tiếng (mặc định). Nhỏ hơn thì mỗi hàng giờ được chia tiếp
// thành nhiều ô con, chọn được giờ lẻ như 09:15.
export const STEP_OPTIONS = [
  { value: 60, label: '1 giờ' },
  { value: 30, label: '30 phút' },
  { value: 15, label: '15 phút' },
  { value: 5, label: '5 phút' },
]

export const MAX_MINUTE_OF_DAY = 24 * 60 - 1 // 23:59

export const minutesToHHMM = (total) => {
  const t = Math.max(0, Math.min(MAX_MINUTE_OF_DAY, Math.round(total)))
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

/** 200000 -> "200.000 ₫" */
export const formatMoney = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${n.toLocaleString('vi-VN')} ₫`
}

/** Nhãn ca gọn để hiện ở danh sách "chỗ của tôi" */
export const slotTitle = (slot) =>
  slot?.label || `${slot?.start_time || ''}–${slot?.end_time || ''}`.trim() || 'Ca học'

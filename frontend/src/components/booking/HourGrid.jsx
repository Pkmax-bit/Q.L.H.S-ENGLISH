import { Check, Plus, Users } from 'lucide-react'
import clsx from 'clsx'
import {
  DAY_SHORT, WEEK_ORDER, colorClasses, formatShortDate, isPastDate, toMinutes,
} from '../../lib/bookingUtils'

const FIRST_HOUR = 7
const LAST_HOUR = 23
const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => FIRST_HOUR + i)

const hourOf = (hhmm) => Math.floor(toMinutes(hhmm) / 60)
const pad2 = (n) => String(n).padStart(2, '0')

const cellKey = (dow, hour) => `${dow}|${hour}`

/**
 * Thời khóa biểu dạng lưới: hàng = giờ 7h–23h, cột = T2…CN.
 *
 * Cách dùng: bấm để CHỌN (tích xanh), chọn xong bao nhiêu ô tùy ý rồi mới bấm
 * nút xác nhận ở thanh hành động. Không gọi API ngay lúc bấm — lỡ tay một cái
 * là mất chỗ hoặc tạo nhầm ca, mà lại phải bấm hủy từng cái.
 *
 * - mode="public": chọn các ca muốn giữ. Riêng ca MÌNH ĐÃ GIỮ thì bấm là hủy
 *   luôn, không gom lô — không ai đi "hủy hàng loạt" cả.
 * - mode="admin": chọn các ô TRỐNG để tạo ca; bấm ca có sẵn thì mở form sửa.
 *
 * 17 hàng × 7 cột không vừa màn hình điện thoại nên lưới cuộn ngang và cột giờ
 * được ghim — nếu không, cuộn sang T6 là mất trục giờ, không biết đang xem giờ nào.
 */
export default function HourGrid({
  mode = 'public',
  board,
  slots = [],
  weekStart,
  busySlotId,
  selected = [],
  onToggleSelect,
  onSlotClick,
}) {
  const accepting = board?.is_accepting
  const isAdmin = mode === 'admin'
  const selectedSet = new Set(selected)

  // Ca nằm ngoài 7h–23h vẫn phải hiện ở đâu đó, không được im lặng biến mất
  const outside = slots.filter(
    (s) => hourOf(s.start_time) < FIRST_HOUR || hourOf(s.start_time) > LAST_HOUR
  )

  const byCell = new Map()
  for (const slot of slots) {
    const h = hourOf(slot.start_time)
    if (h < FIRST_HOUR || h > LAST_HOUR) continue
    const key = cellKey(slot.day_of_week, h)
    if (!byCell.has(key)) byCell.set(key, [])
    byCell.get(key).push(slot)
  }

  // Ngày thật của từng cột: lấy từ chính các ca nếu có, nếu không thì tính từ weekStart
  const dateOf = (dow) => {
    const found = slots.find((s) => s.day_of_week === dow)?.date
    if (found) return found
    if (!weekStart) return null
    const offset = dow === 0 ? 6 : dow - 1
    const d = new Date(`${weekStart}T00:00:00`)
    d.setDate(d.getDate() + offset)
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  }

  const SlotChip = ({ slot }) => {
    const mine = slot.my_entry
    const tone = colorClasses(slot.color)
    const past = isPastDate(slot.date)
    const isSelected = selectedSet.has(slot.id)

    // Ca không thể chọn để giữ chỗ: bảng đóng, ngày đã qua, hoặc đầy mà không có hàng chờ
    const bookable = accepting && !past && (!slot.is_full || slot.allow_waitlist)
    const disabled = isAdmin ? false : !mine && !bookable

    const handleClick = () => {
      if (isAdmin || mine) return onSlotClick?.(slot)
      return onToggleSelect?.({ type: 'slot', key: slot.id, slot })
    }

    return (
      <button
        type="button"
        disabled={disabled || busySlotId === slot.id}
        onClick={handleClick}
        title={
          isAdmin
            ? 'Sửa ca này'
            : mine
              ? 'Bấm để hủy chỗ'
              : !bookable
                ? 'Ca đã đủ chỗ'
                : isSelected
                  ? 'Bỏ chọn ca này'
                  : 'Chọn ca này'
        }
        className={clsx(
          'relative w-full rounded-md border-l-4 border-y border-r px-1.5 py-1 text-left transition-all',
          mine
            ? 'border-emerald-300 border-l-emerald-500 bg-emerald-50'
            : clsx(tone.border, tone.bg),
          isSelected && 'ring-2 ring-primary-500 ring-offset-1',
          !disabled && 'hover:shadow-sm active:scale-[0.98]',
          disabled && 'cursor-not-allowed opacity-55',
          past && 'opacity-50'
        )}
      >
        {isSelected && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-white">
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
        )}
        <span className="block truncate text-[11px] font-semibold leading-tight text-stone-800">
          {slot.start_time}–{slot.end_time}
        </span>
        {slot.label && (
          <span className="block truncate text-[11px] leading-tight text-slate-600">{slot.label}</span>
        )}
        <span
          className={clsx(
            'mt-0.5 flex items-center gap-0.5 text-[10px] font-medium',
            slot.is_full ? 'text-red-500' : 'text-emerald-600'
          )}
        >
          <Users className="h-2.5 w-2.5" />
          {slot.confirmed_count}/{slot.capacity}
          {mine && <span className="ml-0.5 text-emerald-700">· của bạn</span>}
        </span>
      </button>
    )
  }

  const EmptyCell = ({ dow, hour, date }) => {
    const key = cellKey(dow, hour)
    const isSelected = selectedSet.has(key)

    return (
      <button
        type="button"
        onClick={() => onToggleSelect?.({ type: 'cell', key, day_of_week: dow, hour, date })}
        title={
          isSelected
            ? `Bỏ chọn ${DAY_SHORT[dow]} ${pad2(hour)}:00`
            : `Chọn ${DAY_SHORT[dow]} ${pad2(hour)}:00 để tạo ca`
        }
        className={clsx(
          'group flex h-9 w-full items-center justify-center rounded-md border border-dashed transition-colors',
          isSelected
            ? 'border-primary-500 bg-primary-100 text-primary-700'
            : 'border-transparent text-slate-300 hover:border-primary-300 hover:bg-primary-50/60 hover:text-primary-600'
        )}
      >
        {isSelected ? (
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        ) : (
          <Plus className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </button>
    )
  }

  const gridCols = { gridTemplateColumns: '56px repeat(7, minmax(96px, 1fr))' }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <div className="min-w-[760px]">
        {/* Hàng tiêu đề ngày */}
        <div className="grid border-b border-slate-200" style={gridCols}>
          <div className="sticky left-0 z-20 bg-slate-50 px-1 py-2" />
          {WEEK_ORDER.map((dow) => {
            const date = dateOf(dow)
            const past = date ? isPastDate(date) : false
            return (
              <div
                key={dow}
                className={clsx(
                  'border-l border-slate-100 px-1 py-2 text-center',
                  past ? 'bg-slate-50 text-slate-400' : 'bg-primary-50/70 text-primary-800'
                )}
              >
                <p className="text-xs font-semibold">{DAY_SHORT[dow]}</p>
                {date && <p className="text-[11px] opacity-70">{formatShortDate(date)}</p>}
              </div>
            )
          })}
        </div>

        {/* Các hàng giờ */}
        {HOURS.map((hour) => (
          <div key={hour} className="grid border-b border-slate-100 last:border-b-0" style={gridCols}>
            <div className="sticky left-0 z-10 flex items-start justify-end bg-slate-50 px-1.5 py-1 text-[11px] font-medium text-slate-400">
              {pad2(hour)}:00
            </div>

            {WEEK_ORDER.map((dow) => {
              const cellSlots = byCell.get(cellKey(dow, hour)) || []
              const date = dateOf(dow)
              const past = date ? isPastDate(date) : false

              return (
                <div
                  key={dow}
                  className={clsx(
                    'min-h-[44px] space-y-1 border-l border-slate-100 p-1',
                    past && 'bg-slate-50/60'
                  )}
                >
                  {cellSlots.map((slot) => (
                    <SlotChip key={slot.id} slot={slot} />
                  ))}

                  {/* Ô trống: chỉ admin chọn được, để tạo ca đúng thứ + giờ này */}
                  {isAdmin && cellSlots.length === 0 && (
                    <EmptyCell dow={dow} hour={hour} date={date} />
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {outside.length > 0 && (
        <div className="border-t border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs text-amber-800">
            {outside.length} ca nằm ngoài khung 7h–23h nên không hiện trên lưới:{' '}
            {outside.map((s) => `${DAY_SHORT[s.day_of_week]} ${s.start_time}`).join(', ')}
          </p>
        </div>
      )}
    </div>
  )
}

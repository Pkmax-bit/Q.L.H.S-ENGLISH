import { Check, Hand, Plus, Users } from 'lucide-react'
import clsx from 'clsx'
import {
  DAY_SHORT, MAX_MINUTE_OF_DAY, WEEK_ORDER, colorClasses, formatMoney, formatShortDate,
  isPastDate, minutesToHHMM, toMinutes,
} from '../../lib/bookingUtils'

const FIRST_HOUR = 7
const LAST_HOUR = 23
const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => FIRST_HOUR + i)

const pad2 = (n) => String(n).padStart(2, '0')

/** Khóa ô trống: gồm cả phút để chọn được giờ lẻ (09:15 khác 09:00) */
const cellKey = (dow, minute) => `cell|${dow}|${minute}`

/**
 * Thời khóa biểu dạng lưới: hàng = giờ 7h–23h, cột = T2…CN.
 *
 * `stepMinutes` chia nhỏ từng hàng giờ: **mặc định 15 = bốn ô con mỗi giờ**,
 * còn 60 = một ô, 30 = hai ô, 5 = mười hai ô. Vẫn giữ 17 hàng giờ làm khung thay
 * vì sinh thẳng 204 hàng — cột giờ còn đọc được.
 *
 * Cách dùng: bấm để CHỌN (tích xanh), chọn xong bao nhiêu ô tùy ý rồi mới bấm
 * nút xác nhận. Không gọi API ngay lúc bấm — lỡ tay một cái là mất chỗ hoặc tạo
 * nhầm ca, mà lại phải đi hủy từng cái.
 *
 * - mode="public": ca có sẵn → chọn để giữ chỗ (ca mình đã giữ thì bấm là hủy
 *   luôn, không ai hủy hàng loạt). Ô trống → chọn để xin mở lớp giờ đó.
 * - mode="admin": ô trống → chọn để tạo ca; bấm ca có sẵn thì mở form sửa.
 *
 * 17 hàng × 7 cột không vừa màn hình điện thoại nên lưới cuộn ngang và cột giờ
 * được ghim — nếu không, cuộn sang T6 là mất trục giờ, không biết đang xem giờ nào.
 */
export default function HourGrid({
  mode = 'public',
  board,
  slots = [],
  weekStart,
  stepMinutes = 15,
  busySlotId,
  selected = [],
  myRequests = [],
  onToggleSelect,
  onSlotClick,
  onRequestClick,
}) {
  const accepting = board?.is_accepting
  const isAdmin = mode === 'admin'
  const selectedSet = new Set(selected)
  const step = [60, 30, 15, 5].includes(Number(stepMinutes)) ? Number(stepMinutes) : 15
  const subPerHour = 60 / step
  // Chiều cao ô theo từng bước. Trước đây dùng ngưỡng step>=30 nên ô 15 phút bị
  // tụt xuống cùng chiều cao với ô 5 phút — bé tới mức khó bấm trúng.
  const cellH = { 60: 'h-9', 30: 'h-8', 15: 'h-7', 5: 'h-4' }[step]
  // Chỉ đủ chỗ in giờ khi ô cao từ 15 phút trở lên
  const showLabel = step >= 15

  // Nguyện vọng đã gửi, tra theo (ngày|giờ bắt đầu)
  const requestAt = new Map(myRequests.map((r) => [`${r.date}|${r.start_time}`, r]))

  // Ca nằm ngoài 7h–23h vẫn phải hiện ở đâu đó, không được im lặng biến mất
  const outside = slots.filter((s) => {
    const h = Math.floor(toMinutes(s.start_time) / 60)
    return h < FIRST_HOUR || h > LAST_HOUR
  })

  const byDay = new Map(WEEK_ORDER.map((d) => [d, []]))
  for (const slot of slots) {
    const h = Math.floor(toMinutes(slot.start_time) / 60)
    if (h < FIRST_HOUR || h > LAST_HOUR) continue
    if (byDay.has(slot.day_of_week)) byDay.get(slot.day_of_week).push(slot)
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

  const SlotChip = ({ slot, compact }) => {
    const mine = slot.my_entry
    const tone = colorClasses(slot.color)
    const past = isPastDate(slot.date)
    const isSelected = selectedSet.has(slot.id)

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
        title={`${slot.start_time}–${slot.end_time}${slot.label ? ' · ' + slot.label : ''} — ${
          isAdmin
            ? 'bấm để sửa'
            : mine
              ? 'bấm để hủy chỗ'
              : !bookable
                ? 'đã đủ chỗ'
                : isSelected
                  ? 'bỏ chọn'
                  : 'chọn để giữ chỗ'
        }`}
        className={clsx(
          'relative w-full rounded-md border-l-4 border-y border-r px-1.5 text-left transition-all',
          compact ? 'py-0.5' : 'py-1',
          mine ? 'border-emerald-300 border-l-emerald-500 bg-emerald-50' : clsx(tone.border, tone.bg),
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
        {!compact && slot.label && (
          <span className="block truncate text-[11px] leading-tight text-slate-600">{slot.label}</span>
        )}
        {!compact && slot.price_amount !== null && slot.price_amount !== undefined && (
          <span className="block truncate text-[10px] font-medium leading-tight text-emerald-700">
            {formatMoney(slot.price_amount)}
          </span>
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

  /** Một ô con: ca bắt đầu ở đây, hoặc ô trống chọn được, hoặc phần bị ca khác phủ */
  const SubCell = ({ dow, minute, date, daySlots }) => {
    const subEnd = Math.min(minute + step, MAX_MINUTE_OF_DAY + 1)
    const hhmm = minutesToHHMM(minute)

    const starting = daySlots.filter((s) => {
      const st = toMinutes(s.start_time)
      return st >= minute && st < subEnd
    })
    if (starting.length > 0) {
      return (
        <div className="space-y-1">
          {starting.map((s) => (
            <SlotChip key={s.id} slot={s} compact={step < 30} />
          ))}
        </div>
      )
    }

    // Ca khác đè lên khoảng này (vd ca 18:00–19:30 phủ ô 18:30) -> không chọn được
    const covered = daySlots.some(
      (s) => toMinutes(s.start_time) < subEnd && toMinutes(s.end_time) > minute
    )
    if (covered) return <div className="h-full min-h-[14px] rounded bg-slate-100/70" aria-hidden="true" />

    const past = date ? isPastDate(date) : false
    const myReq = requestAt.get(`${date}|${hhmm}`)
    const canAct = isAdmin || (accepting && !past)

    if (myReq) {
      return (
        <button
          type="button"
          onClick={() => onRequestClick?.(myReq)}
          title={`Bạn đã xin học ${DAY_SHORT[dow]} ${myReq.start_time}–${myReq.end_time}${myReq.session_count > 1 ? ` · ${myReq.session_count} buổi` : ''} — bấm để rút`}
          className={clsx(
            'flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-amber-400 bg-amber-50 font-semibold text-amber-700 hover:bg-amber-100',
            cellH,
            showLabel ? 'text-[10px]' : 'text-[9px]'
          )}
        >
          <Hand className={showLabel ? 'h-3 w-3' : 'h-2.5 w-2.5'} />
          {step >= 30 ? 'đã xin' : step === 15 ? myReq.start_time : ''}
        </button>
      )
    }

    if (!canAct) return <div className="min-h-[14px]" aria-hidden="true" />

    const key = cellKey(dow, minute)
    const isSelected = selectedSet.has(key)

    return (
      <button
        type="button"
        onClick={() =>
          onToggleSelect?.({
            type: 'cell',
            key,
            day_of_week: dow,
            date,
            minute,
            start_time: hhmm,
            end_time: minutesToHHMM(subEnd),
            duration: step,
          })
        }
        title={`${DAY_SHORT[dow]} ${hhmm}–${minutesToHHMM(subEnd)} — ${
          isSelected ? 'bỏ chọn' : isAdmin ? 'chọn để tạo ca' : 'chọn để xin mở lớp giờ này'
        }`}
        className={clsx(
          'group flex w-full items-center justify-center gap-1 rounded-md border border-dashed text-[10px] font-medium transition-colors',
          cellH,
          isSelected
            ? 'border-primary-500 bg-primary-100 text-primary-700'
            : 'border-transparent text-slate-300 hover:border-primary-300 hover:bg-primary-50/60 hover:text-primary-600'
        )}
      >
        {isSelected ? (
          <Check className={showLabel ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5'} strokeWidth={3} />
        ) : (
          <Plus
            className={clsx(
              'opacity-0 transition-opacity group-hover:opacity-100',
              showLabel ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5'
            )}
          />
        )}
        {/* In mốc phút để biết đang bấm ô nào; bước 60 thì đã có nhãn ở cột giờ */}
        {showLabel && step < 60 && !isSelected && (
          <span className="opacity-0 transition-opacity group-hover:opacity-100">{hhmm}</span>
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
              const daySlots = byDay.get(dow) || []
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
                  {Array.from({ length: subPerHour }, (_, i) => (
                    <SubCell
                      key={i}
                      dow={dow}
                      minute={hour * 60 + i * step}
                      date={date}
                      daySlots={daySlots}
                    />
                  ))}
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

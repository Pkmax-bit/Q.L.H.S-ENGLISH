import { useEffect, useRef, useState } from 'react'
import { useIsNarrow } from '../../hooks/useIsNarrow'
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
 * Cách dùng: bấm để CHỌN (tích xanh), hoặc **giữ chuột kéo dọc** qua nhiều ô
 * liền nhau — các ô liền nhau trong cùng một ngày gộp lại thành MỘT buổi
 * (19:00 + 19:15 + 19:30 → một buổi 19:00–19:45), nhãn giờ hiện ở ô đầu dải.
 * Chọn xong bao nhiêu dải tùy ý rồi mới bấm nút xác nhận: không gọi API ngay
 * lúc bấm, lỡ tay một cái là mất chỗ hoặc tạo nhầm ca, lại phải đi hủy từng cái.
 *
 * Trên điện thoại thì chạm từng ô — ngón tay còn phải cuộn trang, bắt kéo để
 * chọn sẽ khóa mất thao tác cuộn; chạm các ô liền nhau cũng gộp y như kéo.
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
  onRequestContextMenu,
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

  // --- Kéo chuột chọn nhiều ô ---
  // dragRef giữ cột đang kéo + việc đang làm (thêm hay bỏ chọn): kéo qua ô nào
  // thì ô đó theo đúng việc đó, rê trúng ô đã chọn cũng không bị đảo qua đảo lại.
  const dragRef = useRef(null)
  // Chuột đã bấm thì pointerdown chọn rồi, bỏ qua click theo sau kẻo chọn hai lần.
  // Chạm và bàn phím không đi qua pointerdown nên vẫn xử lý ở click.
  const pointerTypeRef = useRef('touch')
  const [dragging, setDragging] = useState(false)

  // Điện thoại: 7 cột × 17 hàng không vừa màn hình, cuộn ngang thì lạc cột.
  // Hiện MỘT ngày một lúc, có thanh chọn thứ ở trên — ô rộng gần hết màn hình
  // nên chạm trúng dễ hơn hẳn.
  const narrow = useIsNarrow()
  const [activeDow, setActiveDow] = useState(() => {
    const today = new Date().getDay()
    return WEEK_ORDER.includes(today) ? today : 1
  })
  const days = narrow ? [activeDow] : WEEK_ORDER

  // Nhấn giữ = chuột phải. Màn cảm ứng không có chuột phải, không có cái này
  // thì trên điện thoại không cách nào mở bảng công cụ của buổi học.
  const holdRef = useRef(null)
  const heldRef = useRef(false)
  const cancelHold = () => {
    clearTimeout(holdRef.current)
    holdRef.current = null
  }

  useEffect(() => {
    if (!dragging) return
    const stop = () => {
      dragRef.current = null
      setDragging(false)
    }
    // Nhả chuột ngoài lưới vẫn phải kết thúc, không thì rê chuột vào là chọn tiếp
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [dragging])

  // Nguyện vọng đã gửi: giữ cả khoảng phút để TÔ KÍN buổi học trên lưới.
  // Trước đây chỉ tra theo giờ bắt đầu nên buổi 07:30–08:30 chỉ hiện một ô 15
  // phút, ba ô còn lại trông như giờ trống và bấm vào là xin trùng lên chính mình.
  const myRequestRanges = myRequests.map((r) => ({
    req: r,
    date: r.date,
    start: toMinutes(r.start_time),
    end: toMinutes(r.end_time),
  }))
  const requestAt = (date, from, to) =>
    myRequestRanges.find((x) => x.date === date && x.start < to && x.end > from)

  // Ô trống đang chọn, gom theo cột để biết ô nào nối liền ô nào
  const selectedMinutes = new Map()
  for (const key of selected) {
    if (typeof key !== 'string' || !key.startsWith('cell|')) continue
    const [, d, m] = key.split('|')
    const dow = Number(d)
    if (!selectedMinutes.has(dow)) selectedMinutes.set(dow, new Set())
    selectedMinutes.get(dow).add(Number(m))
  }
  const isCellSelected = (dow, minute) => selectedMinutes.get(dow)?.has(minute) || false

  /** Dải ô liền nhau chứa ô này — để in 19:00–20:30 thay vì sáu nhãn 15 phút rời */
  const runOf = (dow, minute) => {
    let start = minute
    while (isCellSelected(dow, start - step)) start -= step
    let end = minute + step
    while (isCellSelected(dow, end)) end += step
    return { start, end }
  }

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
    const mine = date ? requestAt(date, minute, subEnd) : null
    const canAct = isAdmin || (accepting && !past)

    if (mine) {
      const myReq = mine.req
      // Màu do trung tâm đặt cho buổi học; chưa đặt thì dùng hổ phách "đang chờ duyệt".
      // Người đăng ký không chọn màu được, chỉ xem.
      const tone = myReq.color ? colorClasses(myReq.color) : null
      const isStart = mine.start >= minute && mine.start < subEnd
      const isEnd = mine.end > minute && mine.end <= subEnd
      // Ô thứ hai của khối dành cho tên học viên; buổi chỉ dài một ô thì tên
      // nằm ở tooltip, nhồi hai dòng vào ô 28px chỉ còn thấy dấu ba chấm.
      const isNameRow = !isStart && mine.start + step >= minute && mine.start + step < subEnd
      // Dòng thứ ba của khối in ghi chú, buổi nào đủ dài mới có chỗ
      const isNoteRow = !isStart && mine.start + 2 * step >= minute && mine.start + 2 * step < subEnd
      const label = `${DAY_SHORT[dow]} ${myReq.start_time}–${myReq.end_time}${
        myReq.full_name ? ` · ${myReq.full_name}` : ''
      }${myReq.note ? ` · ${myReq.note}` : ''}`
      // Nối liền xuống ô kế bằng một miếng vá ĐẶT TUYỆT ĐỐI, không đổi chiều
      // cao ô. Thử bằng margin âm thì hỏng: margin âm nuốt luôn khe space-y-1
      // nên cả cột ngắn lại 13px so với các cột khác, khối tụt lên và vẫn hở
      // đúng chỗ sang hàng giờ mới.
      // 4px = khe space-y-1 giữa hai ô cùng một hàng giờ.
      // 9px = 4px padding dưới + 1px viền hàng + 4px padding trên của hàng sau.
      const lastOfHour = (minute % 60) + step >= 60
      const bridge = isEnd ? 0 : lastOfHour ? 9 : 4
      return (
        <button
          type="button"
          onClick={() => {
            // Vừa nhấn giữ xong thì trình duyệt vẫn bắn click — bỏ qua, không
            // thì nhả tay ra là rút mất buổi học
            if (heldRef.current) {
              heldRef.current = false
              return
            }
            onRequestClick?.(myReq)
          }}
          // Chuột phải mở menu cho CẢ buổi, không riêng ô vừa bấm
          onContextMenu={(e) => onRequestContextMenu?.(e, { request: myReq, title: label })}
          onPointerDown={(e) => {
            if (e.pointerType !== 'touch') return
            const { clientX, clientY } = e
            heldRef.current = false
            cancelHold()
            holdRef.current = setTimeout(() => {
              heldRef.current = true
              onRequestContextMenu?.(
                { preventDefault() {}, stopPropagation() {}, clientX, clientY },
                { request: myReq, title: label }
              )
            }, 500)
          }}
          onPointerUp={cancelHold}
          onPointerMove={cancelHold}
          onPointerCancel={cancelHold}
          title={`${isAdmin ? 'Đã đăng ký' : 'Bạn đã đăng ký'} ${label}${
            myReq.session_count > 1 ? ` · ${myReq.session_count} buổi` : ''
          } — bấm để ${isAdmin ? 'xem nguyện vọng' : 'rút'}, chuột phải để mở menu`}
          className={clsx(
            'relative z-10 flex w-full items-center justify-center gap-1 border-x font-semibold',
            cellH,
            showLabel ? 'text-[10px]' : 'text-[9px]',
            tone
              ? clsx(tone.border, tone.bg, tone.text, 'hover:brightness-95')
              : 'border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100',
            // Một buổi = MỘT khối liền mạch: bo góc và viền ngang chỉ ở hai đầu
            isStart && 'rounded-t-md border-t',
            isEnd && 'rounded-b-md border-b'
          )}
        >
          {isStart && <Hand className={showLabel ? 'h-3 w-3' : 'h-2.5 w-2.5'} />}
          {isStart && showLabel && (
            <span className="truncate">
              {myReq.start_time}–{myReq.end_time}
            </span>
          )}
          {isNameRow && showLabel && myReq.full_name && (
            <span className="truncate font-medium opacity-80">{myReq.full_name}</span>
          )}
          {isNoteRow && showLabel && myReq.note && (
            <span className="truncate font-normal italic opacity-70">{myReq.note}</span>
          )}
          {bridge > 0 && (
            <span
              aria-hidden="true"
              style={{ height: bridge }}
              className={clsx(
                '-left-px -right-px pointer-events-none absolute top-full border-x',
                tone ? clsx(tone.border, tone.bg) : 'border-amber-400 bg-amber-50'
              )}
            />
          )}
        </button>
      )
    }

    if (!canAct) return <div className="min-h-[14px]" aria-hidden="true" />

    const key = cellKey(dow, minute)
    const isSelected = isCellSelected(dow, minute)
    const run = isSelected ? runOf(dow, minute) : null
    const isRunStart = isSelected && run.start === minute

    const emit = () =>
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

    /** Đưa ô về đúng trạng thái muốn có; đang đúng rồi thì thôi (kéo qua lại không đảo) */
    const paint = (shouldSelect) => {
      if (isSelected === shouldSelect) return
      emit()
    }

    const handlePointerDown = (e) => {
      pointerTypeRef.current = e.pointerType
      // Ngón tay còn phải cuộn trang: bắt kéo từ pointerdown là mất luôn thao tác cuộn
      if (e.pointerType === 'touch') return
      e.preventDefault()
      dragRef.current = { dow, mode: isSelected ? 'remove' : 'add' }
      setDragging(true)
      paint(!isSelected)
    }

    const handlePointerEnter = () => {
      const drag = dragRef.current
      // Chỉ kéo dọc trong một ngày: kéo chéo sang cột khác sẽ thành nhiều buổi
      // rời rạc ở nhiều ngày, gần như luôn là lỡ tay
      if (!drag || drag.dow !== dow) return
      paint(drag.mode === 'add')
    }

    const handleClick = () => {
      if (pointerTypeRef.current === 'mouse' || pointerTypeRef.current === 'pen') return
      // Chạm: ngày này đã có ô nào được chọn thì chạm tiếp = CHỌN CẢ DẢI từ đó
      // tới đây. Không có cái này thì buổi 90 phút phải chạm trúng 6 ô cao 28px.
      const picked = [...(selectedMinutes.get(dow) || [])]
      if (!isSelected && picked.length > 0) {
        const anchor = picked.reduce((a, b) => (Math.abs(b - minute) < Math.abs(a - minute) ? b : a))
        const from = Math.min(anchor, minute)
        const to = Math.max(anchor, minute)
        for (let m = from; m <= to; m += step) {
          if (isCellSelected(dow, m)) continue
          // Gặp ca đã mở chen giữa thì dừng, không chọn xuyên qua lớp của người khác
          const blocked = daySlots.some(
            (x) => toMinutes(x.start_time) < m + step && toMinutes(x.end_time) > m
          )
          if (blocked) continue
          onToggleSelect?.({
            type: 'cell',
            key: cellKey(dow, m),
            day_of_week: dow,
            date,
            minute: m,
            start_time: minutesToHHMM(m),
            end_time: minutesToHHMM(Math.min(m + step, MAX_MINUTE_OF_DAY + 1)),
            duration: step,
          })
        }
        return
      }
      paint(!isSelected)
    }

    return (
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerEnter={handlePointerEnter}
        onClick={handleClick}
        title={`${DAY_SHORT[dow]} ${hhmm}–${minutesToHHMM(subEnd)} — ${
          isSelected
            ? `đang chọn ${minutesToHHMM(run.start)}–${minutesToHHMM(run.end)}, bấm để bỏ ô này`
            : isAdmin
              ? 'bấm hoặc kéo để chọn giờ tạo ca'
              : 'bấm hoặc kéo để chọn giờ muốn đăng ký'
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
        {/* Ô đầu dải in giờ cả buổi (19:00–20:30); ô trống in mốc phút khi rê chuột */}
        {showLabel && isRunStart && (
          <span className="truncate">
            {minutesToHHMM(run.start)}–{minutesToHHMM(run.end)}
          </span>
        )}
        {showLabel && step < 60 && !isSelected && (
          <span className="opacity-0 transition-opacity group-hover:opacity-100">{hhmm}</span>
        )}
      </button>
    )
  }

  const gridCols = narrow
    ? { gridTemplateColumns: '44px 1fr' }
    : { gridTemplateColumns: '56px repeat(7, minmax(96px, 1fr))' }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      {/* Thanh chọn thứ, chỉ trên điện thoại. Chấm nhỏ = ngày đó đã có ca hoặc
          buổi đã đăng ký, để biết đáng bấm sang xem hay không. */}
      {narrow && (
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 p-1.5">
          {WEEK_ORDER.map((dow) => {
            const date = dateOf(dow)
            const busy =
              (byDay.get(dow) || []).length > 0 ||
              myRequestRanges.some((x) => x.date === date)
            return (
              <button
                key={dow}
                type="button"
                onClick={() => setActiveDow(dow)}
                className={clsx(
                  'flex min-w-[44px] flex-1 flex-col items-center rounded-lg px-1 py-1.5 text-xs font-semibold transition-colors',
                  dow === activeDow
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-50 text-slate-600 hover:bg-primary-50'
                )}
              >
                {DAY_SHORT[dow]}
                <span className="text-[10px] font-normal opacity-70">
                  {date ? formatShortDate(date) : ''}
                </span>
                <span
                  className={clsx(
                    'mt-0.5 h-1 w-1 rounded-full',
                    busy ? (dow === activeDow ? 'bg-white' : 'bg-primary-500') : 'bg-transparent'
                  )}
                />
              </button>
            )
          })}
        </div>
      )}

      <div className="overflow-x-auto">
      {/* Đang kéo thì chặn bôi đen chữ, không thì cả lưới xanh lè như copy văn bản */}
      <div className={clsx(!narrow && 'min-w-[760px]', dragging && 'select-none')}>
        {/* Hàng tiêu đề ngày */}
        <div className="grid border-b border-slate-200" style={gridCols}>
          <div className="sticky left-0 z-20 bg-slate-50 px-1 py-2" />
          {days.map((dow) => {
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

            {days.map((dow) => {
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

import { useEffect, useMemo, useRef, useState } from 'react'
import { useIsNarrow } from '../../hooks/useIsNarrow'
import { BadgeCheck, Check, Hand, Plus, Star, Users } from 'lucide-react'
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
  canDrag = false,
  allowPast = false,
  clickAction = 'cancel',
  stampTool = null,
  onStamp,
  onMoveRequest,
  onDropPoolItem,
  fillHeight = false,
  // Khung giờ CÓ THỂ học của học viên. Vẽ thành những sọc đứng trong ô —
  // nhiều người rảnh cùng giờ thì nhiều sọc cạnh nhau, nhìn một cái là thấy
  // chỗ nào đông chỗ nào vắng. Chồng lên nhau bằng độ trong suốt thì hai người
  // cùng màu hồng lại ra một mảng hồng đậm hơn, không đếm được là mấy người.
  availability = [],
}) {
  const accepting = board?.is_accepting
  const isAdmin = mode === 'admin'
  const selectedSet = new Set(selected)
  const step = [60, 30, 15, 5].includes(Number(stepMinutes)) ? Number(stepMinutes) : 15
  const subPerHour = 60 / step
  // Chiều cao ô theo từng bước. Trước đây dùng ngưỡng step>=30 nên ô 15 phút bị
  // tụt xuống cùng chiều cao với ô 5 phút — bé tới mức khó bấm trúng.
  // Chữ trong khối to lên 40% nên ô phải cao theo, không thì chữ bị cắt
  // ngọn. Bước 5 phút vẫn để thấp: ô đó không in chữ, chỉ để kéo chọn.
  const cellH = { 60: 'h-11', 30: 'h-10', 15: 'h-9', 5: 'h-5' }[step]

  // Gom theo ngày một lần thay vì quét cả mảng ở từng ô: lưới 17 giờ x 7 ngày
  // ở bước 15 phút là gần 500 ô, quét tuyến tính mỗi ô thì kéo chọn bị giật.
  const ranhTheoNgay = useMemo(() => {
    const m = new Map()
    for (const k of availability) {
      if (!m.has(k.date)) m.set(k.date, [])
      m.get(k.date).push(k)
    }
    return m
  }, [availability])
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
  // Cao hết phần cha chừa cho: cha là flex column, lưới nhận `flex-1` nên
  // không còn khoảng trống thừa. Trước đây đo bằng getBoundingClientRect rồi
  // tính 100vh trừ đi — sai vài chục px mỗi lần phần đầu trang đổi chiều cao,
  // và luôn để lại một mảng trắng ở dưới.
  const scrollRef = useRef(null)

  // Đang kéo cái gì (dragover không đọc được dataTransfer, trình duyệt chỉ cho
  // đọc lúc drop) + ô đang rê tới, để vẽ trước chỗ sẽ rơi vào
  const dragInfoRef = useRef(null)
  const [dropHint, setDropHint] = useState(null) // { dow, start, end, ok }

  // Vạch "bây giờ": nhìn lưới là biết ngay đang ở đâu trong ngày, buổi nào đã
  // qua, buổi nào sắp tới. Nhịp một phút — lưới giờ không cần chính xác hơn.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])
  const todayIso = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  // Mở trang là cuộn tới giờ hiện tại: lưới dài 17 tiếng, mở ra luôn thấy 7h
  // sáng trong khi việc đang xảy ra lúc 3h chiều. Chỉ làm MỘT lần lúc mở, sau
  // đó người dùng cuộn đi đâu là việc của họ.
  const scrolledRef = useRef(false)
  useEffect(() => {
    if (scrolledRef.current || !fillHeight) return
    const el = scrollRef.current
    if (!el || el.clientHeight === 0) return
    const hourH = el.scrollHeight / (HOURS.length + 1)
    const offset = (Math.floor(nowMinutes / 60) - FIRST_HOUR) * hourH
    if (offset > 0) el.scrollTop = Math.max(0, offset - hourH / 2)
    scrolledRef.current = true
  }, [fillHeight, nowMinutes])

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

  /** Khoảng [from,to) trong ngày này có vướng ca đã mở hay buổi nào khác không */
  const rangeBlocked = (dow, date, from, to, exceptRequestId = null) => {
    const daySlots = byDay.get(dow) || []
    const hitSlot = daySlots.some(
      (x) => toMinutes(x.start_time) < to && toMinutes(x.end_time) > from
    )
    if (hitSlot) return true
    return myRequestRanges.some(
      (x) => x.date === date && x.req.id !== exceptRequestId && x.start < to && x.end > from
    )
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
    // Ai rảnh đúng ô này. Khung phủ ô khi nó bắt đầu trước lúc ô kết thúc và
    // kết thúc sau lúc ô bắt đầu — chạm mép thì không tính là phủ.
    const rangTrongO = (ranhTheoNgay.get(date) || []).filter(
      (k) => toMinutes(k.start_time) < subEnd && toMinutes(k.end_time) > minute
    )

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
    // Ngày đã qua vẫn mờ đi cho dễ phân biệt, nhưng người quản lý thao tác được:
    // xếp bù buổi đã dạy, sửa giờ ghi sai hôm trước
    const canAct = isAdmin || allowPast || (accepting && !past)

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
      const cellCount = Math.max(1, Math.round((mine.end - mine.start) / step))
      const idxInBlock = Math.round((minute - mine.start) / step)
      // Những ô đầu khối đã có chữ: giờ, rồi tên, rồi ghi chú.
      const hasName = showLabel && Boolean(myReq.full_name)
      const hasNote = showLabel && Boolean(myReq.note)
      const textRows =
        1 + (hasName && cellCount >= 2 ? 1 : 0) + (hasNote && cellCount >= 3 ? 1 : 0)
      // Dấu mộc đóng vào khoảng TRỐNG dưới phần chữ, không đóng vào giữa khối
      // nữa: giữa một buổi bốn ô rơi đúng vào ô thứ hai — ô ghi tên — nên tên
      // học viên nằm lọt dưới con dấu đỏ, nhìn chỉ thấy dấu.
      //
      // Hết chỗ trống thì thôi không đóng dấu to, quay về huy hiệu nhỏ ở đầu
      // khối (nhánh !stampFits bên dưới): mất con dấu còn hơn mất cái tên.
      const stampFits = showLabel && cellCount > textRows
      const isStampRow = idxInBlock === textRows + Math.floor((cellCount - textRows - 1) / 2)
      const label = `${DAY_SHORT[dow]} ${myReq.start_time}–${myReq.end_time}${
        myReq.full_name ? ` · ${myReq.full_name}` : ''
      }${myReq.note ? ` · ${myReq.note}` : ''}`
      // Nối liền xuống ô kế bằng một miếng vá ĐẶT TUYỆT ĐỐI, không đổi chiều
      // cao ô. Thử bằng margin âm thì hỏng: margin âm nuốt luôn khe space-y-1
      // nên cả cột ngắn lại 13px so với các cột khác, khối tụt lên và vẫn hở
      // đúng chỗ sang hàng giờ mới.
      // 4px  = khe space-y-1 giữa hai ô cùng một hàng giờ.
      // 10px = 4px padding dưới + 2px viền hàng + 4px padding trên của hàng sau.
      //        Viền hàng giờ là border-b-2; để 9px như hồi viền 1px thì mỗi lần
      //        khối bắc qua ranh giới giờ lại hở một sợi trắng.
      const lastOfHour = (minute % 60) + step >= 60
      const bridge = isEnd ? 0 : lastOfHour ? 10 : 4
      return (
        <button
          type="button"
          draggable={canDrag}
          onDragStart={(e) => {
            // Kéo cả buổi chứ không kéo một ô: dropEffect dùng 'move' để con trỏ
            // báo đúng là dời chỗ, không phải tạo thêm
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'request', id: myReq.id }))
            dragInfoRef.current = {
              kind: 'request',
              id: myReq.id,
              duration: mine.end - mine.start,
              label: myReq.full_name || '',
            }
            cancelHold()
          }}
          onDragEnd={() => {
            dragInfoRef.current = null
            setDropHint(null)
          }}
          onClick={(e) => {
            // Vừa nhấn giữ xong thì trình duyệt vẫn bắn click — bỏ qua, không
            // thì nhả tay ra là rút mất buổi học
            if (heldRef.current) {
              heldRef.current = false
              return
            }
            // Đang cầm một con dấu trên thanh công cụ: bấm là đóng dấu, không
            // mở bảng. Đóng dấu hàng loạt mà mỗi lần phải mở bảng rồi đóng lại
            // thì thà bấm chuột phải từng cái.
            if (stampTool) {
              onStamp?.(myReq, stampTool)
              return
            }
            // Đang sắp xếp (hoặc người quản lý nhìn buổi của học viên khác) thì
            // một cú bấm KHÔNG được xóa: ở chế độ đó người ta bấm để cầm thẻ,
            // mà bấm nhầm là buổi biến mất không dấu vết. Mở bảng công cụ, muốn
            // rút thì bấm nút rút trong đó.
            if (clickAction === 'panel') {
              onRequestContextMenu?.(e, { request: myReq, title: label })
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
          }${myReq.is_bold ? ' · tô đậm' : ''}${myReq.is_marked ? ' · đã đánh dấu' : ''}${
            myReq.done_at ? ' · đã hoàn thành' : ''
          } — bấm để ${
            stampTool
              ? 'đóng dấu'
              : clickAction === 'panel'
                ? 'mở công cụ'
                : isAdmin
                  ? 'xem nguyện vọng'
                  : 'rút'
          }, chuột phải để mở menu`}
          className={clsx(
            'relative z-10 flex w-full items-center justify-center gap-1 border-x font-semibold',
            cellH,
            // To hơn 40% so với 10/9px — tên học viên là thứ phải đọc được
            // từ xa, 10px trên nền màu nhạt thì phải ghé sát màn hình
            showLabel ? 'text-[14px]' : 'text-[13px]',
            tone
              ? clsx(tone.border, tone.bg, tone.text, 'hover:brightness-95')
              : 'border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100',
            // Ba dấu, ba kiểu khác nhau để phân biệt được khi chồng lên nhau:
            //   tô đậm   = chữ đậm + viền dày, nền đậm hơn
            //   đánh dấu = vòng hổ phách quanh khối + ngôi sao
            //   hoàn thành = nhạt đi, việc xong thì thôi hút mắt
            myReq.is_bold && 'border-x-2 font-bold brightness-95',
            myReq.is_marked && 'ring-2 ring-inset ring-amber-400',
            // Không làm nhạt khối nữa: con dấu đỏ đè lên mới là thứ báo đã xong,
            // nhạt cả khối thì chính con dấu cũng mờ theo
            myReq.done_at && !stampFits && 'opacity-60',
            // Một buổi = MỘT khối liền mạch: bo góc và viền ngang chỉ ở hai đầu
            isStart && 'rounded-t-md border-t',
            isEnd && 'rounded-b-md border-b'
          )}
        >
          {isStart && myReq.done_at && !stampFits ? (
            <BadgeCheck className={showLabel ? 'h-3 w-3' : 'h-2.5 w-2.5'} />
          ) : isStart && myReq.is_marked ? (
            <Star className={clsx('fill-current', showLabel ? 'h-3 w-3' : 'h-2.5 w-2.5')} />
          ) : isStart ? (
            <Hand className={showLabel ? 'h-3 w-3' : 'h-2.5 w-2.5'} />
          ) : null}
          {isStart && myReq.is_bold && myReq.is_marked && (
            <Star className={clsx('fill-current', showLabel ? 'h-3 w-3' : 'h-2.5 w-2.5')} />
          )}
          {/* Buổi dài đúng một ô thì không có dòng thứ hai cho tên, mà cao 28px
              không nhồi được cả giờ lẫn tên. Ưu tiên TÊN: vị trí của khối trên
              lưới đã nói giờ rồi, còn tên thì không đoán ra được. Giờ chính xác
              vẫn nằm trong tooltip. */}
          {isStart && showLabel && (
            <span className="truncate">
              {cellCount === 1 && myReq.full_name
                ? myReq.full_name
                : `${myReq.start_time}–${myReq.end_time}`}
            </span>
          )}
          {/* Tên là thứ phải đọc được đầu tiên trên khối: nhìn lưới là biết ai
              học giờ nào. Trước để mờ 80% nên chữ 10px trên nền màu nhạt gần
              như chìm mất. */}
          {isNameRow && showLabel && myReq.full_name && (
            <span className="truncate font-semibold">{myReq.full_name}</span>
          )}
          {isNoteRow && showLabel && myReq.note && (
            <span className="truncate font-normal italic opacity-70">{myReq.note}</span>
          )}
          {myReq.done_at && isStampRow && stampFits && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 -rotate-[14deg] select-none whitespace-nowrap rounded-[4px] border-2 border-red-500/80 bg-white/35 px-2 py-[2px] text-[12px] font-black uppercase leading-tight tracking-[0.12em] text-red-600/90 shadow-[0_0_0_1px_rgba(220,38,38,0.25)_inset]"
            >
              Hoàn thành
            </span>
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
    // Ô trống nhìn như một mảng trắng thì không đoán được 08:15 nằm đâu. Vạch
    // mờ ở mỗi mốc, đậm hơn ở nửa giờ — đủ để ướm mắt mà không thành kẻ ô.
    const atHalf = minute % 60 === 30
    const atHour = minute % 60 === 0
    const inDrop = dropHint?.dow === dow && minute >= dropHint.start && minute < dropHint.end
    const dropStart = inDrop && minute === dropHint.start
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
        onDragOver={
          canDrag
            ? (e) => {
                e.preventDefault()
                const info = dragInfoRef.current
                const dur = info?.duration || step
                const end = Math.min(MAX_MINUTE_OF_DAY + 1, minute + dur)
                // Vẽ sẵn cả khối sẽ rơi xuống, kèm báo đỏ nếu chỗ đó không đủ trống
                if (dropHint?.dow === dow && dropHint?.start === minute) return
                setDropHint({
                  dow,
                  start: minute,
                  end,
                  ok: !rangeBlocked(dow, date, minute, end, info?.id),
                })
              }
            : undefined
        }
        onDrop={
          canDrag
            ? (e) => {
                e.preventDefault()
                let payload = null
                try {
                  payload = JSON.parse(e.dataTransfer.getData('text/plain') || 'null')
                } catch {
                  payload = null
                }
                if (!payload) return
                dragInfoRef.current = null
                setDropHint(null)
                if (payload.kind === 'request') onMoveRequest?.(payload.id, { date, minute })
                if (payload.kind === 'pool') onDropPoolItem?.(payload.id, { date, minute })
              }
            : undefined
        }
        title={`${DAY_SHORT[dow]} ${hhmm}–${minutesToHHMM(subEnd)} — ${
          isSelected
            ? `đang chọn ${minutesToHHMM(run.start)}–${minutesToHHMM(run.end)}, bấm để bỏ ô này`
            : isAdmin
              ? 'bấm hoặc kéo để chọn giờ tạo ca'
              : 'bấm hoặc kéo để chọn giờ muốn đăng ký'
        }`}
        className={clsx(
          'group relative flex w-full items-center justify-center gap-1 rounded-md border border-dashed text-[14px] font-medium transition-colors',
          cellH,
          // Vạch mốc phút: đường kẻ trên đầu ô, không phải viền bao quanh
          !isSelected &&
            !inDrop &&
            !atHour &&
            (atHalf
              ? 'border-t-slate-200 [border-top-style:solid]'
              : 'border-t-slate-100 [border-top-style:dashed]'),
          inDrop
            ? dropHint.ok
              ? 'border-primary-500 bg-primary-200/70 text-primary-800'
              : 'border-red-400 bg-red-100/80 text-red-700'
            : isSelected
              ? 'border-primary-500 bg-primary-100 text-primary-700'
              : 'border-transparent text-slate-300 hover:border-primary-300 hover:bg-primary-50/60 hover:text-primary-600'
        )}
      >
        {/* Sọc giờ rảnh nằm DƯỚI mọi thứ khác trong ô, không bắt chuột —
            nó là nền thông tin, không phải thứ để bấm vào */}
        {rangTrongO.length > 0 && (
          <span className="pointer-events-none absolute inset-0 flex gap-px overflow-hidden rounded-md">
            {rangTrongO.map((k) => (
              <span
                key={k.id}
                className={clsx('flex-1', colorClasses(k.color).dot, 'opacity-30')}
              />
            ))}
          </span>
        )}
        {dropStart && showLabel && (
          <span className="pointer-events-none truncate font-semibold">
            {minutesToHHMM(dropHint.start)}–{minutesToHHMM(dropHint.end)}
            {!dropHint.ok && ' · vướng'}
          </span>
        )}
        {inDrop ? null : isSelected ? (
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
        {showLabel && step < 60 && !isSelected && !inDrop && (
          <span className="opacity-0 transition-opacity group-hover:opacity-100">{hhmm}</span>
        )}
      </button>
    )
  }

  const gridCols = narrow
    ? { gridTemplateColumns: '44px 1fr' }
    : { gridTemplateColumns: '56px repeat(7, minmax(96px, 1fr))' }

  return (
    <div
      className={clsx(
        'rounded-2xl border-2 border-slate-300 bg-white',
        fillHeight && 'flex h-full min-h-0 flex-col'
      )}
    >
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

      {/* Lưới cuộn BÊN TRONG khung, không đẩy cả trang dài ra: 17 hàng giờ mà
          để trang tự cuộn thì cuộn tới 20:00 là mất luôn thanh chọn tuần và
          nút xác nhận. Hàng tiêu đề ngày dính trên để biết đang ở cột nào. */}
      <div ref={scrollRef} className={clsx('overflow-auto', fillHeight && 'min-h-0 flex-1')}>
      {/* Đang kéo thì chặn bôi đen chữ, không thì cả lưới xanh lè như copy văn bản */}
      <div className={clsx(!narrow && 'min-w-[760px]', dragging && 'select-none')}>
        {/* Hàng tiêu đề ngày */}
        <div className="sticky top-0 z-30 grid border-b-2 border-slate-300 bg-white" style={gridCols}>
          <div className="sticky left-0 z-20 bg-slate-50 px-1 py-2" />
          {days.map((dow) => {
            const date = dateOf(dow)
            const past = date ? isPastDate(date) : false
            return (
              <div
                key={dow}
                className={clsx(
                  'border-l-2 border-slate-200 px-1 py-2 text-center',
                  past ? 'bg-slate-50 text-slate-400' : 'bg-primary-50/70 text-primary-800'
                )}
              >
                <p className="text-[17px] font-bold">{DAY_SHORT[dow]}</p>
                {date && <p className="text-[15px] opacity-70">{formatShortDate(date)}</p>}
              </div>
            )
          })}
        </div>

        {/* Các hàng giờ */}
        {HOURS.map((hour) => (
          <div key={hour} className="grid border-b-2 border-slate-200 last:border-b-0" style={gridCols}>
            <div className="sticky left-0 z-10 flex items-start justify-end bg-slate-50 px-1.5 py-1 text-[15px] font-semibold text-slate-500">
              {pad2(hour)}:00
            </div>

            {days.map((dow) => {
              const daySlots = byDay.get(dow) || []
              const date = dateOf(dow)
              const past = date ? isPastDate(date) : false

              const showNow =
                date === todayIso && nowMinutes >= hour * 60 && nowMinutes < (hour + 1) * 60

              return (
                <div
                  key={dow}
                  className={clsx(
                    'relative min-h-[44px] space-y-1 border-l-2 border-slate-200 p-1',
                    past && 'bg-slate-50/60'
                  )}
                >
                  {showNow && (
                    <span
                      aria-hidden="true"
                      style={{ top: `${((nowMinutes - hour * 60) / 60) * 100}%` }}
                      className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                      <span className="h-px flex-1 bg-red-500" />
                    </span>
                  )}
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

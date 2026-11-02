import { Check, Clock, MapPin, Moon, Sun, Sunrise, Sunset, UserRound, Users, Hourglass } from 'lucide-react'
import clsx from 'clsx'
import Button from '../common/Button'
import { DAY_LABELS, DAY_SHORT, WEEK_ORDER, TIME_BANDS, bandOf, colorClasses, formatShortDate, isPastDate } from '../../lib/bookingUtils'

const BAND_ICONS = { sang: Sunrise, trua: Sun, chieu: Sunset, toi: Moon }

function SeatBar({ taken, capacity }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((taken / capacity) * 100)) : 0
  const tone = pct >= 100 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-500'
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={clsx('h-full rounded-full transition-all', tone)} style={{ width: `${pct}%` }} />
    </div>
  )
}

function SlotCard({ slot, accepting, busy, onRegister, onCancel }) {
  const mine = slot.my_entry
  const past = isPastDate(slot.date)
  const locked = !accepting || past
  const tone = colorClasses(slot.color)

  return (
    <div
      className={clsx(
        'rounded-xl border-l-4 border-y border-r p-3 transition-colors',
        // Chỗ của mình thì ưu tiên màu xanh xác nhận — "đây là chỗ tôi giữ"
        // quan trọng hơn "ca này do ai tạo"
        mine ? 'border-emerald-300 border-l-emerald-500 bg-emerald-50/60' : clsx(tone.border, tone.bg),
        past && 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-sm font-semibold text-stone-900">
            <span className={clsx('h-2 w-2 shrink-0 rounded-full', tone.dot)} aria-hidden="true" />
            <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {slot.start_time}–{slot.end_time}
          </p>
          {slot.label && <p className="mt-0.5 truncate text-sm text-slate-600">{slot.label}</p>}
        </div>
        {mine && (
          <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
            {mine.status === 'waitlist' ? 'Hàng chờ' : 'Chỗ của bạn'}
          </span>
        )}
      </div>

      {(slot.teacher_name || slot.room_name) && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          {slot.teacher_name && (
            <span className="flex items-center gap-1">
              <UserRound className="h-3 w-3" />
              {slot.teacher_name}
            </span>
          )}
          {slot.room_name && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {slot.room_name}
            </span>
          )}
        </div>
      )}

      {slot.note && <p className="mt-2 text-xs italic text-slate-500">{slot.note}</p>}

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 font-medium text-slate-600">
            <Users className="h-3.5 w-3.5" />
            {slot.confirmed_count}/{slot.capacity} chỗ
          </span>
          <span className={clsx(slot.is_full ? 'text-red-500' : 'text-emerald-600')}>
            {slot.is_full ? 'Đã đủ' : `còn ${slot.seats_left}`}
          </span>
        </div>
        <SeatBar taken={slot.confirmed_count} capacity={slot.capacity} />
      </div>

      {slot.people.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {slot.people.map((name, i) => (
            <span
              key={`${slot.id}-p-${i}`}
              className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600"
            >
              {name}
            </span>
          ))}
        </div>
      )}

      {slot.waitlist_count > 0 && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-amber-600">
          <Hourglass className="h-3 w-3" />
          {slot.waitlist_count} người đang chờ
        </p>
      )}

      <div className="mt-3">
        {mine ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            loading={busy}
            disabled={locked}
            onClick={() => onCancel(slot)}
          >
            Hủy chỗ
          </Button>
        ) : slot.is_full && !slot.allow_waitlist ? (
          <Button variant="secondary" size="sm" className="w-full" disabled>
            Đã đủ chỗ
          </Button>
        ) : (
          <Button
            variant={slot.is_full ? 'warning' : 'primary'}
            size="sm"
            className="w-full"
            loading={busy}
            disabled={locked}
            onClick={() => onRegister(slot)}
            icon={slot.is_full ? Hourglass : Check}
          >
            {slot.is_full ? 'Vào hàng chờ' : 'Giữ chỗ'}
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Lưới tuần: 7 cột trên máy tính, xếp dọc theo ngày trên điện thoại.
 * Phần lớn phụ huynh mở bằng điện thoại nên lưới 7 cột không thể là layout duy nhất.
 */
export default function WeekSlotGrid({ board, slots = [], busySlotId, onRegister, onCancel }) {
  const byDay = new Map(WEEK_ORDER.map((d) => [d, []]))
  for (const slot of slots) {
    if (byDay.has(slot.day_of_week)) byDay.get(slot.day_of_week).push(slot)
  }

  const accepting = board?.is_accepting

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
      {WEEK_ORDER.map((dow) => {
        const daySlots = byDay.get(dow) || []
        const date = daySlots[0]?.date
        const past = date ? isPastDate(date) : false

        return (
          <div
            key={dow}
            className={clsx(
              'flex flex-col gap-2',
              // Ngày trống thì ẩn trên điện thoại cho đỡ phải cuộn qua 7 khối rỗng
              daySlots.length === 0 && 'hidden md:flex'
            )}
          >
            <div
              className={clsx(
                'sticky top-0 z-10 rounded-lg px-2 py-1.5 text-center backdrop-blur',
                past ? 'bg-slate-100/90 text-slate-400' : 'bg-primary-50/90 text-primary-800'
              )}
            >
              <p className="text-sm font-semibold md:hidden">{DAY_LABELS[dow]}</p>
              <p className="hidden text-sm font-semibold md:block">{DAY_SHORT[dow]}</p>
              {date && <p className="text-xs opacity-70">{formatShortDate(date)}</p>}
            </div>

            {daySlots.length === 0 ? (
              <p className="hidden rounded-lg border border-dashed border-slate-200 py-4 text-center text-xs text-slate-300 md:block">
                Không có ca
              </p>
            ) : (
              // Gom theo buổi; chỉ hiện buổi nào thật sự có ca để cột không bị
              // nhồi 4 tiêu đề rỗng
              TIME_BANDS.map((band) => {
                const bandSlots = daySlots.filter((s) => bandOf(s.start_time).key === band.key)
                if (bandSlots.length === 0) return null
                const BandIcon = BAND_ICONS[band.key]

                return (
                  <div key={band.key} className="flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 px-0.5">
                      <BandIcon className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {band.label}
                      </span>
                      <span className="h-px flex-1 bg-slate-200" />
                    </div>
                    {bandSlots.map((slot) => (
                      <SlotCard
                        key={slot.id}
                        slot={slot}
                        accepting={accepting}
                        busy={busySlotId === slot.id}
                        onRegister={onRegister}
                        onCancel={onCancel}
                      />
                    ))}
                  </div>
                )
              })
            )}
          </div>
        )
      })}
    </div>
  )
}

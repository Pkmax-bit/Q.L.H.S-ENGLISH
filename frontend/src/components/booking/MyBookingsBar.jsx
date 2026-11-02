import { useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import clsx from 'clsx'
import { DAY_SHORT, formatShortDate } from '../../lib/bookingUtils'

/**
 * Thanh "Chỗ của bạn" cố định dưới màn hình.
 *
 * Với bảng nhiều tuần, chỉ hiện chỗ của tuần đang xem là chưa đủ: muốn hủy một
 * ca tuần sau, học viên phải mò qua từng tab tuần mới thấy. Nên thanh này gom
 * TOÀN BỘ chỗ của họ trong cả bảng, hủy được ngay tại chỗ.
 */
export default function MyBookingsBar({
  entries = [],
  currentWeek,
  multiWeek = false,
  busyEntryId,
  onCancel,
  onGoToWeek,
}) {
  const [expanded, setExpanded] = useState(false)

  if (entries.length === 0) {
    return (
      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <p className="text-sm text-slate-500">
            {multiWeek
              ? 'Bạn chưa giữ ca nào — chọn một ca phía trên, hoặc chuyển sang tuần khác.'
              : 'Bạn chưa giữ ca nào — chọn một ca phía trên nhé.'}
          </p>
        </div>
      </div>
    )
  }

  const thisWeek = entries.filter((e) => e.week_start === currentWeek)
  const otherWeeks = entries.filter((e) => e.week_start !== currentWeek)

  const Chip = ({ entry, dimmed }) => (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium',
        entry.status === 'waitlist' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800',
        dimmed && 'opacity-80'
      )}
    >
      {dimmed && onGoToWeek ? (
        <button
          type="button"
          className="underline-offset-2 hover:underline"
          onClick={() => onGoToWeek(entry.week_start)}
          title="Mở tuần này"
        >
          {DAY_SHORT[entry.day_of_week]} {formatShortDate(entry.date)}
        </button>
      ) : (
        <span>
          {DAY_SHORT[entry.day_of_week]} {formatShortDate(entry.date)}
        </span>
      )}
      <span className="opacity-80">
        {entry.start_time}–{entry.end_time}
        {entry.label ? ` · ${entry.label}` : ''}
        {entry.status === 'waitlist' ? ' (chờ)' : ''}
      </span>
      <button
        type="button"
        disabled={busyEntryId === entry.id}
        onClick={() => onCancel(entry)}
        className="ml-0.5 rounded p-0.5 hover:bg-white/70 disabled:opacity-40"
        title="Hủy chỗ này"
        aria-label="Hủy chỗ này"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  )

  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-stone-800">
            Chỗ của bạn ({entries.length}):
          </span>

          {thisWeek.map((e) => (
            <Chip key={e.id} entry={e} />
          ))}

          {otherWeeks.length > 0 && !expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
            >
              +{otherWeeks.length} ca ở tuần khác
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
          )}

          {expanded && otherWeeks.map((e) => <Chip key={e.id} entry={e} dimmed />)}

          {expanded && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-slate-600"
            >
              Thu gọn
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

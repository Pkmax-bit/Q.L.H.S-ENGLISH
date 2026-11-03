import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { formatShortDate, isPastDate } from '../../lib/bookingUtils'

/**
 * Thanh chọn tuần cho bảng trải nhiều tuần.
 * Một bảng có tối đa 6 tuần nên hiện hết thành nút được, không cần dropdown.
 * Trên điện thoại thanh này cuộn ngang, kèm hai nút lùi/tới cho dễ bấm.
 */
export default function WeekPicker({ weeks = [], selected, onSelect, disabled = false }) {
  if (weeks.length <= 1) return null

  const index = weeks.findIndex((w) => w.week_start === selected)
  const prev = index > 0 ? weeks[index - 1] : null
  const next = index >= 0 && index < weeks.length - 1 ? weeks[index + 1] : null

  return (
    <div className="mb-2 flex items-center gap-2">
      <button
        type="button"
        disabled={!prev || disabled}
        onClick={() => prev && onSelect(prev.week_start)}
        className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:border-primary-200 hover:text-primary-600 disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:text-slate-500"
        aria-label="Tuần trước"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
        {weeks.map((week) => {
          const active = week.week_start === selected
          const past = isPastDate(week.week_end)
          return (
            <button
              key={week.week_start}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(week.week_start)}
              className={clsx(
                'relative shrink-0 rounded-xl border px-3 py-1.5 text-left transition-colors',
                active
                  ? 'border-primary-500 bg-primary-600 text-white shadow-sm'
                  : past
                    ? 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-primary-200'
              )}
            >
              <span className="block text-[11px] font-medium uppercase tracking-wide opacity-70">
                Tuần {week.index}
                {past && ' · đã qua'}
              </span>
              <span className="block text-sm font-semibold">
                {formatShortDate(week.week_start)} – {formatShortDate(week.week_end)}
              </span>
              {week.my_count > 0 && (
                <span
                  className={clsx(
                    'absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold',
                    active ? 'bg-white text-primary-700' : 'bg-emerald-500 text-white'
                  )}
                  title={`Bạn đã giữ ${week.my_count} ca tuần này`}
                >
                  {week.my_count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        disabled={!next || disabled}
        onClick={() => next && onSelect(next.week_start)}
        className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:border-primary-200 hover:text-primary-600 disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:text-slate-500"
        aria-label="Tuần sau"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

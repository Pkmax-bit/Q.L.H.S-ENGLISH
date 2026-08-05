import { Flame } from 'lucide-react'
import clsx from 'clsx'
import { getStreakFireCount, getStreakLabel, getStreakTierClass } from '../../lib/streakUtils'

export default function StreakBadge({ streak, compact = false, className = '' }) {
  const days = streak?.current ?? 0
  const fires = streak?.fires ?? getStreakFireCount(days)
  const longest = streak?.longest ?? 0
  const activeToday = streak?.active_today ?? false
  const tierClass = getStreakTierClass(days)

  if (compact) {
    return (
      <div
        className={clsx(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/30 bg-white/15 backdrop-blur-md',
          className
        )}
      >
        {fires > 0 ? (
          <span className="flex items-center" aria-hidden>
            {Array.from({ length: fires }).map((_, i) => (
              <Flame
                key={i}
                className={clsx(
                  'h-4 w-4 -ml-0.5 first:ml-0',
                  i === fires - 1 ? 'text-amber-300' : 'text-orange-400/90'
                )}
                fill="currentColor"
              />
            ))}
          </span>
        ) : (
          <Flame className="h-4 w-4 text-white/50" />
        )}
        <span className="text-xs sm:text-sm font-bold text-white tabular-nums">
          {days > 0 ? `${days} ngày` : 'Chưa có chuỗi'}
        </span>
      </div>
    )
  }

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-2xl border border-orange-200/60 bg-gradient-to-br p-4 sm:p-5',
        days > 0 ? tierClass : 'from-slate-100 to-slate-50',
        className
      )}
    >
      {days >= 7 && (
        <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/20 blur-2xl pointer-events-none" />
      )}

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={clsx('text-xs font-semibold uppercase tracking-wide', days > 0 ? 'text-white/90' : 'text-stone-500')}>
            Chuỗi học tập
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={clsx('text-3xl sm:text-4xl font-extrabold tabular-nums', days > 0 ? 'text-white' : 'text-stone-700')}>
              {days}
            </span>
            <span className={clsx('text-sm font-medium', days > 0 ? 'text-white/90' : 'text-stone-500')}>
              ngày liên tiếp
            </span>
          </div>
          <p className={clsx('mt-1 text-xs font-medium', days > 0 ? 'text-white/80' : 'text-stone-400')}>
            {getStreakLabel(days)}
            {longest > days && ` · Kỷ lục: ${longest} ngày`}
          </p>
          {!activeToday && days > 0 && (
            <p className="mt-1 text-[11px] text-white/75 font-medium">
              Học hôm nay để giữ chuỗi 🔥
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <div className="flex items-end justify-center min-h-[2.5rem]" aria-label={`${fires} lửa chuỗi`}>
            {fires > 0 ? (
              Array.from({ length: fires }).map((_, i) => (
                <Flame
                  key={i}
                  className={clsx(
                    'drop-shadow-lg animate-pulse',
                    i === 0 ? 'h-7 w-7 text-yellow-200' :
                    i === 1 ? 'h-8 w-8 text-amber-300 -ml-1' :
                    i === 2 ? 'h-9 w-9 text-orange-400 -ml-1' :
                    i === 3 ? 'h-10 w-10 text-orange-500 -ml-1.5' :
                    'h-11 w-11 text-red-500 -ml-1.5'
                  )}
                  fill="currentColor"
                  style={{ animationDelay: `${i * 120}ms`, animationDuration: '1.8s' }}
                />
              ))
            ) : (
              <Flame className="h-8 w-8 text-stone-300" />
            )}
          </div>
          {activeToday && days > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-white/90 bg-white/20 px-2 py-0.5 rounded-full">
              Hôm nay ✓
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

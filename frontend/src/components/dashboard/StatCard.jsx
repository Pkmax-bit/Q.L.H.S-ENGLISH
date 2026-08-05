import clsx from 'clsx'

const COLOR_MAP = {
  blue: { icon: 'bg-blue-500', text: 'text-blue-700', ring: 'ring-blue-100' },
  green: { icon: 'bg-emerald-500', text: 'text-emerald-700', ring: 'ring-emerald-100' },
  purple: { icon: 'bg-primary-600', text: 'text-primary-800', ring: 'ring-primary-100' },
  amber: { icon: 'bg-amber-500', text: 'text-amber-800', ring: 'ring-amber-100' },
  red: { icon: 'bg-red-500', text: 'text-red-700', ring: 'ring-red-100' },
  orange: { icon: 'bg-orange-500', text: 'text-orange-700', ring: 'ring-orange-100' },
  slate: { icon: 'bg-slate-400', text: 'text-slate-600', ring: 'ring-slate-100' },
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  color = 'blue',
  onClick,
  hint,
  className = '',
}) {
  const colors = COLOR_MAP[color] || COLOR_MAP.blue
  const clickable = typeof onClick === 'function'

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={clickable ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={clsx(
        'app-card-hover p-4 sm:p-5 flex items-center gap-4',
        clickable && 'cursor-pointer',
        className
      )}
    >
      {Icon && (
        <div className={clsx('shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ring-4', colors.icon, colors.ring)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs sm:text-sm text-stone-500 truncate">{label}</p>
        <p className={clsx('text-xl sm:text-2xl font-bold tabular-nums mt-0.5', colors.text)}>
          {value ?? '—'}
        </p>
        {hint && <p className="text-[11px] text-stone-400 mt-0.5 truncate">{hint}</p>}
      </div>
    </div>
  )
}

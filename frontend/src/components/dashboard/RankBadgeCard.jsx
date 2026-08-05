import clsx from 'clsx'

/** Emblem SVG theo hạng — phong cách shield/medal rank-icon */
export function RankEmblem({ tierId, className = '', size = 72 }) {
  const common = { width: size, height: size, viewBox: '0 0 80 80', className: clsx('shrink-0 drop-shadow-lg', className) }

  switch (tierId) {
    case 'bronze':
      return (
        <svg {...common} aria-hidden>
          <defs>
            <linearGradient id="br-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fdba74" />
              <stop offset="50%" stopColor="#c2410c" />
              <stop offset="100%" stopColor="#7c2d12" />
            </linearGradient>
          </defs>
          <path fill="url(#br-g)" d="M40 6 L66 18 V42 C66 58 54 70 40 76 C26 70 14 58 14 42 V18 Z" />
          <path fill="none" stroke="#fed7aa" strokeWidth="2" opacity="0.7" d="M40 12 L60 21 V42 C60 54 51 64 40 69 C29 64 20 54 20 42 V21 Z" />
          <circle cx="40" cy="38" r="12" fill="#7c2d12" opacity="0.35" />
          <path fill="#ffedd5" d="M40 28 L44 36 H53 L46 41 L49 50 L40 44 L31 50 L34 41 L27 36 H36 Z" />
        </svg>
      )
    case 'silver':
      return (
        <svg {...common} aria-hidden>
          <defs>
            <linearGradient id="sv-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="45%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>
          <path fill="url(#sv-g)" d="M40 6 L66 18 V42 C66 58 54 70 40 76 C26 70 14 58 14 42 V18 Z" />
          <path fill="none" stroke="#f1f5f9" strokeWidth="2" opacity="0.8" d="M40 12 L60 21 V42 C60 54 51 64 40 69 C29 64 20 54 20 42 V21 Z" />
          <circle cx="40" cy="40" r="14" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
          <circle cx="40" cy="40" r="7" fill="#e2e8f0" />
        </svg>
      )
    case 'gold':
      return (
        <svg {...common} aria-hidden>
          <defs>
            <linearGradient id="gd-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
          </defs>
          <path fill="url(#gd-g)" d="M40 4 L68 16 V40 C68 58 54 72 40 78 C26 72 12 58 12 40 V16 Z" />
          <path fill="none" stroke="#fef3c7" strokeWidth="2.2" d="M40 11 L62 20 V40 C62 54 52 65 40 70 C28 65 18 54 18 40 V20 Z" />
          <path fill="#fffbeb" d="M40 24 L43.5 33 H53 L45.5 38.5 L48.5 48 L40 42 L31.5 48 L34.5 38.5 L27 33 H36.5 Z" />
          <path fill="#fbbf24" opacity="0.9" d="M28 18 L32 14 L36 18 L32 20 Z M44 18 L48 14 L52 18 L48 20 Z M40 12 L42 8 L44 12 L42 13 Z" />
        </svg>
      )
    case 'platinum':
      return (
        <svg {...common} aria-hidden>
          <defs>
            <linearGradient id="pt-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="45%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#0c4a6e" />
            </linearGradient>
          </defs>
          <path fill="url(#pt-g)" d="M40 6 L66 18 V42 C66 58 54 70 40 76 C26 70 14 58 14 42 V18 Z" />
          <path fill="none" stroke="#e0f2fe" strokeWidth="2" d="M40 12 L60 21 V42 C60 54 51 64 40 69 C29 64 20 54 20 42 V21 Z" />
          <path fill="#e0f2fe" d="M40 26 L52 40 L40 54 L28 40 Z" />
          <path fill="#0369a1" opacity="0.5" d="M40 32 L46 40 L40 48 L34 40 Z" />
        </svg>
      )
    case 'diamond':
      return (
        <svg {...common} aria-hidden>
          <defs>
            <linearGradient id="dm-g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="40%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#075985" />
            </linearGradient>
          </defs>
          <path fill="url(#dm-g)" d="M40 8 L70 28 L52 72 H28 L10 28 Z" />
          <path fill="none" stroke="#f0f9ff" strokeWidth="1.8" opacity="0.85" d="M40 14 L64 30 L50 66 H30 L16 30 Z" />
          <path fill="#f0f9ff" opacity="0.9" d="M40 18 L58 30 H22 Z" />
          <path fill="#7dd3fc" opacity="0.7" d="M22 30 L40 30 L30 66 Z" />
          <path fill="#0ea5e9" opacity="0.55" d="M40 30 L58 30 L50 66 Z" />
        </svg>
      )
    case 'legend':
      return (
        <svg {...common} aria-hidden>
          <defs>
            <linearGradient id="lg-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="35%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#0c1f33" />
            </linearGradient>
          </defs>
          <path fill="url(#lg-g)" d="M40 4 L70 16 V38 C70 58 54 72 40 78 C26 72 10 58 10 38 V16 Z" />
          <path fill="none" stroke="#fde68a" strokeWidth="2" d="M40 10 L64 20 V38 C64 54 52 66 40 71 C28 66 16 54 16 38 V20 Z" />
          <path fill="#fef3c7" d="M24 22 L32 18 L40 24 L48 18 L56 22 L52 30 H28 Z" />
          <circle cx="40" cy="46" r="11" fill="#0c1f33" opacity="0.45" />
          <path fill="#fbbf24" d="M40 38 L43 44 H50 L44 48 L46 55 L40 51 L34 55 L36 48 L30 44 H37 Z" />
        </svg>
      )
    default: // novice
      return (
        <svg {...common} aria-hidden>
          <defs>
            <linearGradient id="nv-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#cbd5e1" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
          </defs>
          <path fill="url(#nv-g)" d="M40 8 L64 20 V44 C64 58 52 68 40 74 C28 68 16 58 16 44 V20 Z" />
          <circle cx="40" cy="40" r="11" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
          <circle cx="40" cy="40" r="4" fill="#e2e8f0" />
        </svg>
      )
  }
}

/**
 * Thẻ hạng — card đẹp theo từng cấp (rank-icon vibe).
 */
export default function RankBadgeCard({ profile, className = '' }) {
  if (!profile?.tier) return null
  const { tier, level, progressPct, xpIntoLevel, xpNeedThisLevel, streakDays, activeToday } = profile

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-xl',
        className
      )}
      style={{
        background: `linear-gradient(145deg, ${tier.cardFrom}, ${tier.cardTo})`,
        borderColor: tier.ring,
        boxShadow: `0 16px 40px -16px ${tier.glow}`,
      }}
    >
      <div
        className="pointer-events-none absolute -top-10 -right-8 h-36 w-36 rounded-full blur-3xl opacity-60"
        style={{ background: tier.accent }}
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-10 h-32 w-32 rounded-full blur-3xl opacity-40"
        style={{ background: tier.glow }}
      />

      <div className="relative flex items-start gap-3">
        <div
          className="rounded-2xl p-1.5 bg-black/15 ring-1 backdrop-blur-sm"
          style={{ boxShadow: `0 0 0 1px ${tier.ring}` }}
        >
          <RankEmblem tierId={tier.id} size={64} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/75">
            Hạng · {tier.nameEn}
          </p>
          <h3 className="font-display text-xl font-semibold text-white leading-tight mt-0.5">
            {tier.name}
          </h3>
          <p className="text-xs text-white/80 mt-1 tabular-nums">
            Level <span className="font-bold text-white text-sm">{level}</span>
            {streakDays > 0 && (
              <span className="text-white/65"> · Chuỗi {streakDays} ngày</span>
            )}
          </p>
        </div>
      </div>

      <div className="relative mt-4">
        <div className="flex items-center justify-between text-[11px] font-semibold text-white/85 mb-1.5">
          <span>Điểm sao</span>
          <span className="tabular-nums">
            {xpIntoLevel}/{xpNeedThisLevel} điểm sao
          </span>
        </div>
        <div className="h-2 rounded-full bg-black/25 overflow-hidden ring-1 ring-white/15">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progressPct}%`,
              background: `linear-gradient(90deg, ${tier.accent}, #fff)`,
            }}
          />
        </div>
        {activeToday && streakDays > 0 && (
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-white/90">
            Đã hoạt động hôm nay
          </p>
        )}
      </div>
    </div>
  )
}

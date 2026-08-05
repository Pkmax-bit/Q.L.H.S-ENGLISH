import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { Sparkles, LayoutDashboard, GraduationCap, Shield, Star } from 'lucide-react'
import UserAvatar from '../common/UserAvatar'
import StreakBadge from './StreakBadge'
import RankBadgeCard, { RankEmblem } from './RankBadgeCard'
import { buildRankProfileFromEarned } from '../../lib/rankUtils'

const ROLE_META = {
  admin: {
    label: 'Quản trị viên',
    Icon: Shield,
    subtitle: 'Tổng quan trung tâm — học sinh, lớp học & tài chính',
    // Một màu Academic ink
    heroFrom: '#0c1f33',
    heroVia: '#0c1f33',
    heroTo: '#0c1f33',
    accent: '#7dd3fc',
    ring: 'rgba(125,211,252,0.35)',
    glow: 'rgba(12,31,51,0.4)',
  },
  teacher: {
    label: 'Giáo viên',
    Icon: GraduationCap,
    subtitle: 'Theo dõi lớp dạy, chấm bài & duy trì chuỗi giảng dạy',
    heroFrom: '#0c1f33',
    heroVia: '#0c1f33',
    heroTo: '#0c1f33',
    accent: '#7dd3fc',
    ring: 'rgba(125,211,252,0.35)',
    glow: 'rgba(12,31,51,0.4)',
  },
  student: {
    label: 'Học sinh',
    Icon: GraduationCap,
    subtitle: 'Làm bài tập kiếm điểm sao — lên level và mở game',
    heroFrom: '#0c1f33',
    heroVia: '#0c1f33',
    heroTo: '#0c1f33',
    accent: '#7dd3fc',
    ring: 'rgba(125,211,252,0.35)',
    glow: 'rgba(12,31,51,0.4)',
  },
}

export default function DashboardHero({ user, streak, wallet, extra }) {
  const role = user?.role || 'student'
  const meta = ROLE_META[role] || ROLE_META.student
  const RoleIcon = meta.Icon
  const displayName = user?.full_name || user?.name || 'bạn'
  const firstName = displayName.trim().split(/\s+/).slice(-1)[0] || 'bạn'
  const weekday = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const isStudent = role === 'student'
  const showStreak = isStudent || role === 'teacher'
  const rank = isStudent
    ? buildRankProfileFromEarned(wallet?.earned ?? 0, streak)
    : null
  const theme = rank?.tier
    ? {
        heroFrom: rank.tier.heroFrom,
        heroVia: rank.tier.heroVia,
        heroTo: rank.tier.heroTo,
        accent: rank.tier.accent,
        ring: rank.tier.ring,
        glow: rank.tier.glow,
      }
    : meta

  const profileHref = user?.id ? `/social/u/${user.id}` : '/profile'
  const avatarSrc = user?.avatar_url || user?.avatar || null
  const balance = Number(wallet?.balance) || 0

  return (
    <header
      className="relative overflow-hidden rounded-3xl animate-rise-in"
      style={{ boxShadow: `0 20px 50px -18px ${theme.glow}` }}
    >
      <div
        className="relative w-full min-h-[11rem] sm:min-h-[12rem]"
        style={
          theme.heroFrom === theme.heroTo
            ? { backgroundColor: theme.heroFrom }
            : {
                background: `linear-gradient(135deg, ${theme.heroFrom} 0%, ${theme.heroVia} 48%, ${theme.heroTo} 100%)`,
              }
        }
      >
        <div className="absolute inset-0 opacity-80 pointer-events-none">
          <div
            className="absolute -top-16 -right-12 w-72 h-72 rounded-full blur-3xl animate-soft-pulse"
            style={{ background: `radial-gradient(circle, ${theme.accent}55, transparent 70%)` }}
          />
          <div
            className="absolute -bottom-20 -left-16 w-80 h-80 rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, ${theme.glow}, transparent 70%)` }}
          />
        </div>

        {isStudent && rank && (
          <div className="absolute right-2 bottom-0 sm:right-6 sm:bottom-[-8px] opacity-[0.12] pointer-events-none select-none">
            <RankEmblem tierId={rank.tier.id} size={160} />
          </div>
        )}

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
            <Link
              to={profileHref}
              className="relative shrink-0 rounded-full transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              title="Xem trang cá nhân"
              aria-label="Xem trang cá nhân"
            >
              <div
                className="rounded-full p-0.5"
                style={{ boxShadow: `0 0 0 3px ${theme.ring}` }}
              >
                <UserAvatar
                  name={displayName}
                  avatarUrl={avatarSrc}
                  size="lg"
                  className="shadow-xl ring-2 ring-white/20"
                />
              </div>
              {isStudent && rank && (
                <div
                  className="absolute -bottom-1 -right-1 rounded-xl bg-black/30 p-0.5 ring-1 backdrop-blur-sm pointer-events-none"
                  style={{ boxShadow: `0 0 0 1px ${theme.ring}` }}
                  title={`${rank.tier.name} · Lv.${rank.level}`}
                >
                  <RankEmblem tierId={rank.tier.id} size={28} />
                </div>
              )}
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2 text-white/75 text-xs font-semibold uppercase tracking-[0.14em] mb-1">
                <LayoutDashboard className="h-3.5 w-3.5" />
                Tổng quan
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-white leading-tight tracking-tight">
                Xin chào,{' '}
                <Link
                  to={profileHref}
                  className="underline decoration-white/25 underline-offset-4 hover:decoration-white/70 transition"
                >
                  {firstName}
                </Link>
              </h1>
              <p className="text-sm text-white/70 mt-1.5 max-w-xl">{meta.subtitle}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {isStudent && rank && (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-md border text-xs font-semibold text-white"
                    style={{
                      background: 'rgba(255,255,255,0.12)',
                      borderColor: theme.ring,
                    }}
                  >
                    <RankEmblem tierId={rank.tier.id} size={16} />
                    {rank.tier.name} · Lv.{rank.level}
                  </span>
                )}
                {isStudent && (
                  <Link
                    to="/shop"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-md border text-xs font-semibold text-amber-100 hover:bg-white/10 transition"
                    style={{
                      background: 'rgba(251,191,36,0.15)',
                      borderColor: 'rgba(251,191,36,0.35)',
                    }}
                    title="Cửa hàng game"
                  >
                    <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                    {balance} sao
                  </Link>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 backdrop-blur-md border border-white/15 text-xs font-medium text-white/90">
                  <RoleIcon className="h-3.5 w-3.5" />
                  {meta.label}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 backdrop-blur-md border border-white/15 text-xs font-medium text-white/90">
                  <Sparkles className="h-3.5 w-3.5" style={{ color: theme.accent }} />
                  {weekday}
                </span>
                {showStreak && isStudent && <StreakBadge streak={streak} compact />}
              </div>

              {isStudent && rank && (
                <div className="mt-3 max-w-sm">
                  <div className="flex justify-between text-[10px] font-semibold text-white/75 mb-1">
                    <span>Điểm sao đến level {rank.level + 1}</span>
                    <span className="tabular-nums">{rank.progressPct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/25 overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full transition-all duration-500')}
                      style={{
                        width: `${rank.progressPct}%`,
                        background: `linear-gradient(90deg, ${theme.accent}, #ffffff)`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:min-w-[280px] lg:max-w-[320px]">
            {isStudent && rank && <RankBadgeCard profile={rank} />}
            {showStreak && <StreakBadge streak={streak} className="shadow-lg" />}
            {extra}
          </div>
        </div>
      </div>
    </header>
  )
}

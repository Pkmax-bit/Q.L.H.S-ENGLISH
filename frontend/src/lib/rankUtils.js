/**
 * Hệ thống hạng / level / XP — đồng bộ từ streak (và có thể mở rộng sau).
 * Phong cách badge rank (shield/medal) tham chiếu visual rank-icon trên Dribbble.
 */

export const RANK_TIERS = [
  {
    id: 'novice',
    name: 'Tân binh',
    nameEn: 'Novice',
    minLevel: 1,
    maxLevel: 2,
    // slate / iron
    heroFrom: '#334155',
    heroVia: '#475569',
    heroTo: '#64748b',
    accent: '#94a3b8',
    cardFrom: '#475569',
    cardTo: '#1e293b',
    ring: 'rgba(148,163,184,0.45)',
    glow: 'rgba(100,116,139,0.35)',
  },
  {
    id: 'bronze',
    name: 'Đồng',
    nameEn: 'Bronze',
    minLevel: 3,
    maxLevel: 4,
    heroFrom: '#7c2d12',
    heroVia: '#9a3412',
    heroTo: '#c2410c',
    accent: '#fdba74',
    cardFrom: '#b45309',
    cardTo: '#7c2d12',
    ring: 'rgba(251,146,60,0.5)',
    glow: 'rgba(234,88,12,0.4)',
  },
  {
    id: 'silver',
    name: 'Bạc',
    nameEn: 'Silver',
    minLevel: 5,
    maxLevel: 6,
    heroFrom: '#334155',
    heroVia: '#64748b',
    heroTo: '#94a3b8',
    accent: '#e2e8f0',
    cardFrom: '#94a3b8',
    cardTo: '#475569',
    ring: 'rgba(226,232,240,0.55)',
    glow: 'rgba(148,163,184,0.4)',
  },
  {
    id: 'gold',
    name: 'Vàng',
    nameEn: 'Gold',
    minLevel: 7,
    maxLevel: 9,
    heroFrom: '#78350f',
    heroVia: '#b45309',
    heroTo: '#d97706',
    accent: '#fde68a',
    cardFrom: '#f59e0b',
    cardTo: '#92400e',
    ring: 'rgba(252,211,77,0.55)',
    glow: 'rgba(245,158,11,0.45)',
  },
  {
    id: 'platinum',
    name: 'Bạch kim',
    nameEn: 'Platinum',
    minLevel: 10,
    maxLevel: 12,
    heroFrom: '#0c1f33',
    heroVia: '#15556e',
    heroTo: '#1a6b8a',
    accent: '#7dd3fc',
    cardFrom: '#0ea5e9',
    cardTo: '#0c4a6e',
    ring: 'rgba(125,211,252,0.5)',
    glow: 'rgba(14,165,233,0.4)',
  },
  {
    id: 'diamond',
    name: 'Kim cương',
    nameEn: 'Diamond',
    minLevel: 13,
    maxLevel: 16,
    heroFrom: '#0c4a6e',
    heroVia: '#0369a1',
    heroTo: '#38bdf8',
    accent: '#e0f2fe',
    cardFrom: '#38bdf8',
    cardTo: '#075985',
    ring: 'rgba(186,230,253,0.6)',
    glow: 'rgba(56,189,248,0.45)',
  },
  {
    id: 'legend',
    name: 'Huyền thoại',
    nameEn: 'Legend',
    minLevel: 17,
    maxLevel: 99,
    heroFrom: '#0c1f33',
    heroVia: '#7c2d12',
    heroTo: '#b45309',
    accent: '#fbbf24',
    cardFrom: '#f59e0b',
    cardTo: '#0c1f33',
    ring: 'rgba(251,191,36,0.55)',
    glow: 'rgba(245,158,11,0.5)',
  },
]

/** XP cần để lên level tiếp theo (level 1 → 2 cần 100, tăng dần) */
export function xpForLevel(level) {
  if (level < 1) return 0
  return Math.round(80 + level * 45 + level * level * 8)
}

/** Tổng XP tích lũy từ level 1 đến trước `level` */
export function totalXpToReachLevel(level) {
  let sum = 0
  for (let L = 1; L < level; L += 1) sum += xpForLevel(L)
  return sum
}

/**
 * XP ước tính từ streak (client-side, không cần schema mới).
 * current nặng hơn longest; có bonus khi active hôm nay.
 */
export function computeXpFromStreak(streak) {
  const current = Number(streak?.current) || 0
  const longest = Number(streak?.longest) || 0
  const activeToday = Boolean(streak?.active_today)
  const base = current * 55 + Math.max(0, longest - current) * 18
  const milestone =
    (current >= 3 ? 40 : 0) +
    (current >= 7 ? 120 : 0) +
    (current >= 14 ? 250 : 0) +
    (current >= 30 ? 500 : 0)
  const todayBonus = activeToday && current > 0 ? 35 : 0
  return Math.max(0, base + milestone + todayBonus)
}

export function getProgressFromXp(xp) {
  let level = 1
  let remaining = Math.max(0, xp)
  while (remaining >= xpForLevel(level) && level < 99) {
    remaining -= xpForLevel(level)
    level += 1
  }
  const need = xpForLevel(level)
  const into = remaining
  const pct = need > 0 ? Math.min(100, Math.round((into / need) * 100)) : 100
  return {
    level,
    xp,
    xpIntoLevel: into,
    xpToNext: Math.max(0, need - into),
    xpNeedThisLevel: need,
    progressPct: pct,
  }
}

export function getRankTierByLevel(level) {
  const L = Math.max(1, level)
  for (let i = RANK_TIERS.length - 1; i >= 0; i -= 1) {
    if (L >= RANK_TIERS[i].minLevel) return RANK_TIERS[i]
  }
  return RANK_TIERS[0]
}

export function buildRankProfile(streak) {
  const xp = computeXpFromStreak(streak)
  const progress = getProgressFromXp(xp)
  const tier = getRankTierByLevel(progress.level)
  return {
    ...progress,
    tier,
    streakDays: Number(streak?.current) || 0,
    longest: Number(streak?.longest) || 0,
    activeToday: Boolean(streak?.active_today),
  }
}

/** Rank / level từ tổng điểm sao đã kiếm (shop_points_earned). */
export function buildRankProfileFromEarned(earned, streak = null) {
  const xp = Math.max(0, Math.round(Number(earned) || 0))
  const progress = getProgressFromXp(xp)
  const tier = getRankTierByLevel(progress.level)
  return {
    ...progress,
    tier,
    streakDays: Number(streak?.current) || 0,
    longest: Number(streak?.longest) || 0,
    activeToday: Boolean(streak?.active_today),
  }
}

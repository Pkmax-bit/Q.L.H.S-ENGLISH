import {
  BookOpen, FileText, GraduationCap, Heart, ImagePlus, Plus, RefreshCw, Sparkles, Users,
} from 'lucide-react'

export default function SocialFeedHero({
  user,
  stats,
  postsToday = 0,
  refreshing = false,
  onRefresh,
  onCreatePost,
}) {
  const firstName = (user?.full_name || 'bạn').trim().split(/\s+/).slice(-1)[0] || 'bạn'
  const weekday = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })

  const kpis = [
    { icon: Users, label: 'Thành viên', value: stats?.members_total ?? 0, color: 'from-sky-500 to-primary-600' },
    { icon: FileText, label: 'Bài viết hôm nay', value: stats?.posts_today ?? postsToday, color: 'from-primary-500 to-primary-700' },
    { icon: GraduationCap, label: 'Giáo viên', value: stats?.teachers_count ?? 0, color: 'from-teal-500 to-cyan-700' },
    { icon: BookOpen, label: 'Lớp học', value: stats?.classes_count ?? 0, color: 'from-slate-500 to-slate-700' },
  ]

  return (
    <header className="relative overflow-hidden rounded-3xl shadow-[0_20px_50px_-18px_rgba(12,31,51,0.45)] mb-5 animate-rise-in">
      <div className="relative w-full bg-gradient-to-br from-[#0c1f33] via-[#15556e] to-[#1a6b8a] min-h-[14rem] sm:min-h-[15rem]">
        <div className="absolute inset-0 opacity-80 pointer-events-none">
          <div className="absolute -top-20 -right-16 w-80 h-80 rounded-full bg-gradient-to-br from-sky-300/25 via-teal-400/15 to-transparent blur-3xl animate-soft-pulse" />
          <div className="absolute -bottom-24 -left-20 w-96 h-96 rounded-full bg-gradient-to-br from-cyan-400/20 via-slate-600/15 to-transparent blur-3xl" />
        </div>

        <div className="absolute right-4 top-4 z-20 flex gap-2">
          <button
            type="button"
            onClick={onCreatePost}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-primary-900 text-sm font-semibold shadow-lg hover:bg-sky-50 transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> Tạo bài viết
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 backdrop-blur border border-white/25 text-sm font-semibold text-white shadow-md hover:bg-white/25 transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-5 px-5 py-5 sm:px-7 sm:py-6 pt-16 sm:pt-14">
          <div className="flex flex-col gap-3 justify-center">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-sky-400 to-primary-700 shadow-xl ring-2 ring-white/30 flex items-center justify-center shrink-0">
                <Heart className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white leading-tight">
                  Bảng tin nội bộ
                </h1>
                <p className="text-xs sm:text-sm font-medium text-sky-100/85">
                  Kết nối — Chia sẻ — Phát triển cùng nhau
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/12 backdrop-blur-md border border-white/20 shadow-md">
                <Sparkles className="h-3.5 w-3.5 text-sky-200" aria-hidden />
                <span className="text-xs sm:text-[13px] font-semibold text-white">
                  Chào {firstName} — {weekday}
                </span>
              </span>
              {(stats?.posts_today ?? postsToday) > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/25 backdrop-blur-md border border-emerald-300/35 shadow">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 animate-soft-pulse" />
                  <span className="text-xs sm:text-[13px] font-semibold text-white">
                    {stats?.posts_today ?? postsToday} bài mới hôm nay
                  </span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={onCreatePost}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 transition-colors"
              >
                <ImagePlus className="h-3.5 w-3.5 text-sky-200" />
                <span className="text-[11px] font-semibold text-white">Ảnh / File</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 self-center">
            {kpis.map((k, i) => {
              const Icon = k.icon
              return (
                <div
                  key={i}
                  className={`group relative flex items-center gap-3 rounded-2xl bg-white/10 hover:bg-white/18 backdrop-blur-md border border-white/20 px-3.5 py-3 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl overflow-hidden animate-rise-in animate-rise-in-delay-${Math.min(i + 1, 3)}`}
                >
                  <div className={`shrink-0 h-11 w-11 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center shadow-md ring-1 ring-white/30`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-2xl font-bold leading-none tabular-nums text-white">
                      {k.value}
                    </p>
                    <p className="text-[11px] font-semibold mt-0.5 truncate text-white/85">
                      {k.label}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </header>
  )
}

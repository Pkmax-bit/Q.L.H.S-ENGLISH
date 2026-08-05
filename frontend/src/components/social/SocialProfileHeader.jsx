import { Link } from 'react-router-dom'
import {
  ArrowLeft, BadgeCheck, Camera, Loader2, MessageCircle, Pencil, ShieldCheck, Sparkles,
} from 'lucide-react'
import { mediaUrl, profileRoleLabel } from '../../lib/socialUtils'
import SocialAvatar from './SocialAvatar'

export default function SocialProfileHeader({
  profile,
  isOwn = false,
  onEditCover,
  onEditAvatar,
  onMessage,
  showMessage = false,
  loadingCover = false,
  loadingAvatar = false,
  onBack,
}) {
  if (!profile) return null

  const cover = mediaUrl(profile.cover_url)
  const headerName = profile.full_name || profile.email || 'Thành viên'
  const roleLabel = profileRoleLabel(profile.role)

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(76,29,149,0.35)]">
      <div
        className="relative w-full aspect-[16/6] min-h-[16rem] sm:min-h-[18rem] max-h-[26rem] bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400"
        style={cover ? { backgroundImage: `url(${cover})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/10 pointer-events-none" aria-hidden />

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 text-xs font-semibold text-gray-800 shadow hover:bg-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Bảng tin
          </button>
        )}

        {isOwn && onEditCover && (
          <div className="absolute right-4 top-4 z-20">
            <button
              type="button"
              onClick={onEditCover}
              disabled={loadingCover}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 text-xs font-semibold text-gray-800 shadow hover:bg-white disabled:opacity-60"
            >
              {loadingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              {cover ? 'Đổi ảnh bìa' : 'Thêm ảnh bìa'}
            </button>
          </div>
        )}
      </div>

      <div className="absolute inset-0 z-10 flex items-end p-5 sm:p-7 pointer-events-none">
        <div className="flex items-end gap-4 sm:gap-6 w-full flex-wrap">
          <div className="relative shrink-0 pointer-events-auto">
            <div className="rounded-full ring-4 ring-white/85 shadow-2xl">
              <SocialAvatar user={profile} size="xl" className="border-4 border-white" />
            </div>
            {isOwn && onEditAvatar && (
              <button
                type="button"
                onClick={onEditAvatar}
                disabled={loadingAvatar}
                className="absolute bottom-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow-lg ring-2 ring-white hover:bg-gray-100 hover:text-indigo-600 disabled:opacity-60 transition-colors"
                title="Đổi ảnh đại diện"
              >
                {loadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
            )}
          </div>

          <div className="flex-1 min-w-0 pb-2 pointer-events-auto">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                {headerName}
              </h1>
              <BadgeCheck className="h-6 w-6 sm:h-7 sm:w-7 text-sky-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" aria-label="Verified" />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {roleLabel && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-md ring-1 ring-white/50">
                  <ShieldCheck className="h-3.5 w-3.5 text-white drop-shadow" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white drop-shadow">
                    {roleLabel}
                  </span>
                </div>
              )}
              {profile.post_count != null && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/25 backdrop-blur border border-white/40 text-white text-xs font-semibold drop-shadow">
                  {profile.post_count} bài viết
                </span>
              )}
            </div>
            {profile.bio && (
              <div className="mt-3 inline-flex items-start gap-2 max-w-2xl rounded-xl bg-white/15 backdrop-blur-md border border-white/30 px-3 py-1.5 shadow-md">
                <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-amber-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]" aria-hidden />
                <p className="text-sm sm:text-[15px] font-medium italic line-clamp-2 leading-relaxed text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]">
                  “{profile.bio}”
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 ml-auto pb-2 pointer-events-auto">
            {isOwn ? (
              <Link
                to="/profile"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/90 backdrop-blur text-sm font-semibold text-gray-800 shadow hover:bg-white"
              >
                <Pencil className="h-4 w-4" />
                Chỉnh sửa
              </Link>
            ) : showMessage && onMessage ? (
              <button
                type="button"
                onClick={onMessage}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-lg"
              >
                <MessageCircle className="h-4 w-4" />
                Nhắn tin
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

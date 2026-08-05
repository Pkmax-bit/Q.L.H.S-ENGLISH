import { useEffect, useState } from 'react'
import { resolveUploadUrl } from '../../utils/uploadUrl'

const SIZES = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-24 w-24 text-2xl',
}

function initialsFromName(name, max = 2) {
  if (!name) return '?'
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, max).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).slice(0, max).toUpperCase()
}

/**
 * Avatar dùng chung toàn app — resolve URL upload + fallback chữ cái khi lỗi ảnh.
 */
export default function UserAvatar({
  name,
  avatarUrl,
  size = 'md',
  className = '',
}) {
  const sizeCls = SIZES[size] || SIZES.md
  const resolved = avatarUrl ? resolveUploadUrl(avatarUrl) : ''
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [resolved])

  const showImg = Boolean(resolved) && !failed
  const initial = initialsFromName(name, size === 'xs' || size === 'sm' ? 1 : 2)

  if (showImg) {
    return (
      <img
        src={resolved}
        alt={name || 'Avatar'}
        onError={() => setFailed(true)}
        className={`rounded-full object-cover shrink-0 bg-slate-100 ${sizeCls} ${className}`}
      />
    )
  }

  return (
    <div
      className={`rounded-full bg-primary-100 text-primary-800 font-semibold flex items-center justify-center shrink-0 ${sizeCls} ${className}`}
      aria-hidden
      title={name || undefined}
    >
      {initial}
    </div>
  )
}

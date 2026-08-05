import { Link } from 'react-router-dom'
import { bubbleGradient } from '../../lib/messengerUtils'
import { mediaUrl, initials } from '../../lib/socialUtils'

export default function SocialAvatar({ user, size = 'md', linkToProfile = false, className = '' }) {
  const dim = size === 'lg' ? 'h-10 w-10 text-sm' : size === 'xl' ? 'h-40 w-40 text-3xl' : 'h-10 w-10 text-xs'
  const name = user?.full_name || user?.email || '?'
  const avatar = mediaUrl(user?.avatar_url || user?.avatar)

  const inner = avatar ? (
    <img
      src={avatar}
      alt={name}
      className={`${dim} shrink-0 rounded-full border border-white/60 object-cover ${className}`}
    />
  ) : (
    <div
      className={`${dim} shrink-0 flex items-center justify-center rounded-full font-semibold text-white ${className}`}
      style={{ background: bubbleGradient(name) }}
      title={name}
    >
      {initials(name, size === 'xl' ? 2 : 2)}
    </div>
  )

  if (linkToProfile && user?.id) {
    return (
      <Link to={`/social/u/${user.id}`} className="shrink-0 rounded-full hover:opacity-90 ring-2 ring-white/70 hover:ring-blue-300 transition">
        {inner}
      </Link>
    )
  }

  return inner
}

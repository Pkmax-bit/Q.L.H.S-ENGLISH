import clsx from 'clsx'
import { MessageCircle } from 'lucide-react'

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = (Date.now() - d) / 1000
  if (diff < 60) return 'Vừa xong'
  if (diff < 3600) return `${Math.floor(diff / 60)} phút`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

export default function MessengerThreadList({ groups, activeId, unreadByGroup, onSelect }) {
  if (!groups.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-stone-400">
        <MessageCircle className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-sm">Chưa có hội thoại nào</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-amber-100/80">
      {groups.map((g) => {
        const unread = unreadByGroup[g.id] || g.unread_count || 0
        const active = activeId === g.id
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => onSelect(g)}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
              active ? 'bg-amber-100/70' : 'hover:bg-amber-50/60',
            )}
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white font-bold shadow-sm shrink-0">
              {(g.display_name || g.name || '?').slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-stone-900 truncate text-sm">{g.display_name || g.name}</p>
                <span className="text-[10px] text-stone-400 shrink-0">{formatTime(g.last_message_at)}</span>
              </div>
              <p className="text-xs text-stone-500 truncate mt-0.5">{g.last_message || '—'}</p>
            </div>
            {unread > 0 && (
              <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

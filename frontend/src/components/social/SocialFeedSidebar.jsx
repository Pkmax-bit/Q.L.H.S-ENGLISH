import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, MessageSquare, TrendingUp, Users } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useMessenger } from '../../context/MessengerContext'
import { profileRoleLabel } from '../../lib/socialUtils'
import messengerService from '../../services/messenger.service'
import SocialAvatar from './SocialAvatar'

function extractTrendingTags(posts, limit = 5) {
  const counts = new Map()
  for (const p of posts || []) {
    const matches = String(p.body || '').match(/#[\w\u00C0-\u024F\u1E00-\u1EFF]+/gi) || []
    for (const raw of matches) {
      const tag = raw.slice(1).toLowerCase()
      if (tag.length >= 2) counts.set(tag, (counts.get(tag) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }))
}

export default function SocialFeedSidebar({ posts = [] }) {
  const { user } = useAuth()
  const { createDirect, openDock, refreshGroups } = useMessenger()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [chatLoadingId, setChatLoadingId] = useState(null)

  const trending = useMemo(() => extractTrendingTags(posts), [posts])

  useEffect(() => {
    let cancelled = false
    messengerService.listContacts()
      .then((list) => { if (!cancelled) setMembers(list || []) })
      .catch(() => { if (!cancelled) setMembers([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const openChat = async (member) => {
    setChatLoadingId(member.id)
    try {
      const g = await createDirect(member.id)
      await refreshGroups()
      openDock(g)
    } finally {
      setChatLoadingId(null)
    }
  }

  const sidebarMembers = members.slice(0, 6)

  return (
    <aside className="hidden lg:block space-y-4">
      <div className="sticky top-4 space-y-4">
        <section className="rounded-2xl bg-white/75 backdrop-blur-md border border-white/60 shadow-sm overflow-hidden">
          <header className="flex items-center justify-between px-4 py-3 border-b border-slate-100/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-emerald-600" />
              Thành viên ({members.length})
            </h3>
            <Link to="/messenger" className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700">Tin nhắn</Link>
          </header>
          <ul className="divide-y divide-slate-100/70">
            {loading && sidebarMembers.length === 0 && (
              <li className="px-4 py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải…
              </li>
            )}
            {sidebarMembers.map((u) => {
              const isMe = String(u.id) === String(user?.id)
              return (
                <li key={u.id} className="group">
                  <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/80 transition-colors">
                    <Link to={`/social/u/${u.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                      <SocialAvatar user={u} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {u.full_name || u.email}
                          {isMe && <span className="ml-1 text-[10px] font-medium text-slate-400">(bạn)</span>}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{profileRoleLabel(u.role)}</p>
                      </div>
                    </Link>
                    {!isMe && (
                      <button
                        type="button"
                        onClick={() => openChat(u)}
                        disabled={chatLoadingId === u.id}
                        className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 transition-colors disabled:opacity-60"
                        title={`Chat với ${u.full_name || u.email}`}
                      >
                        {chatLoadingId === u.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MessageSquare className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
            {!loading && sidebarMembers.length === 0 && (
              <li className="px-4 py-6 text-center text-xs text-slate-400">Chưa có thành viên</li>
            )}
          </ul>
        </section>

        <section className="rounded-2xl bg-white/75 backdrop-blur-md border border-white/60 shadow-sm overflow-hidden">
          <header className="flex items-center justify-between px-4 py-3 border-b border-slate-100/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 inline-flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-fuchsia-600" />
              Xu hướng
            </h3>
          </header>
          <ul className="divide-y divide-slate-100/70">
            {trending.length > 0 ? trending.map((t) => (
              <li key={t.tag} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50/80 transition-colors">
                <span className="text-sm font-semibold text-indigo-600 truncate">#{t.tag}</span>
                <span className="text-[11px] text-slate-500 shrink-0">{t.count} bài viết</span>
              </li>
            )) : (
              <li className="px-4 py-6 text-center text-xs text-slate-400">Chưa có hashtag nổi bật</li>
            )}
          </ul>
        </section>
      </div>
    </aside>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, User } from 'lucide-react'
import socialService from '../../services/social.service'
import SocialAvatar from './SocialAvatar'

export default function SocialMemberSearch() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [hits, setHits] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
      setHits([])
      return undefined
    }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const list = await socialService.searchMembers(term)
        setHits(list || [])
        setOpen(true)
      } catch {
        setHits([])
      } finally {
        setLoading(false)
      }
    }, 280)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="relative">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          if (!e.target.value.trim()) setOpen(false)
        }}
        onFocus={() => { if (hits.length) setOpen(true) }}
        onBlur={() => { setTimeout(() => setOpen(false), 180) }}
        placeholder="Tìm thành viên (tên, email)…"
        className="w-full rounded-2xl border border-white/60 bg-white/65 backdrop-blur-xl py-2.5 pl-10 pr-3 text-sm shadow-sm focus:border-blue-400 focus:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-200/60 transition placeholder:text-slate-500 text-slate-900"
      />
      {open && hits.length > 0 && (
        <ul className="absolute z-40 mt-1.5 w-full max-h-64 overflow-y-auto rounded-2xl border border-white/60 bg-white/95 backdrop-blur-xl py-1 shadow-xl [scrollbar-width:thin]">
          {hits.map((u) => (
            <li key={u.id}>
              <Link
                to={`/social/u/${u.id}`}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-200/70 transition-colors"
                onMouseDown={(e) => e.preventDefault()}
              >
                <SocialAvatar user={u} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate text-slate-900">{u.full_name || u.email}</p>
                  <p className="text-xs truncate text-slate-500">{u.email}</p>
                </div>
                <User className="h-4 w-4 text-slate-400 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {open && q.trim().length >= 2 && !loading && !hits.length && (
        <p className="absolute z-40 mt-1.5 w-full rounded-2xl border border-white/60 bg-white/95 backdrop-blur px-3 py-2 text-xs text-slate-500 shadow-xl">
          Không tìm thấy thành viên.
        </p>
      )}
    </div>
  )
}

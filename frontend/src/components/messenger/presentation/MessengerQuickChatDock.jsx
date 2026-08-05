/**
 * Presentation — thanh chat nhanh mép phải (layout QLCV: căn giữa dọc, chìm/hover, panel trái).
 */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  MessageCircle, X, Search, Pin, ChevronRight, Users, Loader2,
  PanelRightClose, PanelRightOpen, UserPlus,
} from 'lucide-react'
import { useMessenger } from '../../../context/MessengerContext'
import messengerService from '../../../services/messenger.service'
import { bubbleGradient, formatPreviewTime, initials, contactSubtitle } from '../../../lib/messengerUtils'

export const DOCK_W = 84
export const DOCK_VISUAL_W = DOCK_W + 12
export const PANEL_W = 320
export const DOCK_RIGHT = 16
const DOCK_SHADOW = '0 12px 40px rgba(15, 23, 42, 0.12)'
const DOCK_SHADOW_SUNK = '0 4px 16px rgba(15, 23, 42, 0.06)'
const DOCK_COLLAPSED_KEY = 'qlhs_messenger_dock_collapsed'
const DOCK_PINNED_KEY = 'qlhs_messenger_dock_pinned'
const MAX_STRIP = 8
const SUNK_PEEK = 24
const PINNED_SUNK_PEEK = 52

function UnreadBadge({ count, prominent, pulseRing }) {
  if (!count || count <= 0) return null
  const label = count > 99 ? '99+' : count
  if (prominent) {
    return (
      <span className="absolute top-0 right-0 z-10 flex items-center justify-center">
        {pulseRing && (
          <span className="absolute inline-flex h-6 w-6 rounded-full bg-red-500 opacity-40 animate-ping" />
        )}
        <span className="relative min-w-[20px] h-5 px-1 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-white shadow-lg">
          {label}
        </span>
      </span>
    )
  }
  return (
    <span className="absolute top-0.5 right-0.5 z-10 min-w-4 h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
      {label}
    </span>
  )
}

function PreviewLine({ text, unread }) {
  const preview = String(text || '').trim()
  if (!preview) return null
  return (
    <span
      className={`block truncate mt-0.5 px-2 py-0.5 rounded-md border text-[11px] leading-snug ${
        unread > 0
          ? 'font-semibold text-red-900 bg-red-50 border-red-200'
          : 'font-medium text-slate-600 bg-slate-50 border-slate-100'
      }`}
      title={preview}
    >
      {preview}
    </span>
  )
}

function DockAvatar({ name, active, ringClass = '' }) {
  return (
    <span
      className={`relative w-10 h-10 rounded-2xl flex items-center justify-center text-white text-[11px] font-semibold shadow-sm overflow-hidden ${
        active ? 'ring-2 ring-blue-500 shadow-[0_0_0_3px_rgba(37,99,235,0.2)]' : ringClass || 'ring-2 ring-white'
      }`}
      style={{ background: bubbleGradient(name) }}
    >
      {initials(name, 2)}
    </span>
  )
}

function HoverCard({ item, anchorRect, onPin, onClose }) {
  if (!item || !anchorRect) return null
  const cardW = 248
  const top = Math.max(12, Math.min(anchorRect.top + anchorRect.height / 2 - 60, window.innerHeight - 140))
  const left = anchorRect.left - cardW - 12

  return createPortal(
    <div
      className="fixed z-[130] pointer-events-auto"
      style={{ top, left: Math.max(12, left), width: cardW }}
      onMouseLeave={onClose}
    >
      <div className="rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xl p-3.5 shadow-xl">
        <div className="flex items-start gap-3">
          <DockAvatar name={item.title} active={false} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 truncate">{item.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {item.is_direct ? 'Chat trực tiếp' : 'Nhóm chat nội bộ'}
            </p>
            {item.last_message && (
              <PreviewLine text={item.last_message} unread={item.unread} className="mt-2" />
            )}
            <button
              type="button"
              onClick={(e) => onPin(item.id, e)}
              className={`mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                item.pinned
                  ? 'border-amber-500 bg-amber-50 text-amber-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-amber-400'
              }`}
            >
              <Pin className={`h-3 w-3 ${item.pinned ? 'fill-current' : ''}`} />
              {item.pinned ? 'Bỏ ghim' : 'Ghim lên thanh chat'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function MessengerQuickChatDock() {
  const {
    dockShortcuts, dockWindows, totalUnread, loadingGroups, openDock, togglePin,
    dockPanelOpen, setDockPanelOpen, refreshGroups,
  } = useMessenger()

  const [search, setSearch] = useState('')
  const [contacts, setContacts] = useState([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [startingChat, setStartingChat] = useState(null)
  const [raised, setRaised] = useState(false)
  const [avatarsCollapsed, setAvatarsCollapsed] = useState(() => {
    try { return localStorage.getItem(DOCK_COLLAPSED_KEY) === '1' } catch { return false }
  })
  const [dockPinned, setDockPinned] = useState(() => {
    try { return localStorage.getItem(DOCK_PINNED_KEY) === '1' } catch { return false }
  })
  const [hoverItem, setHoverItem] = useState(null)
  const [hoverRect, setHoverRect] = useState(null)
  const leaveTimer = useRef(null)
  const hoverTimer = useRef(null)
  const stripRef = useRef(null)
  const panelRef = useRef(null)
  const dockRef = useRef(null)

  const dockActive = raised || dockPanelOpen || dockPinned
  const compactW = avatarsCollapsed ? 56 : DOCK_W
  const compactOuter = compactW + 12
  const pinnedSinkX = dockActive ? 0 : Math.max(0, compactOuter - PINNED_SUNK_PEEK)
  const mainSinkX = dockActive ? 0 : Math.max(0, compactOuter - SUNK_PEEK - pinnedSinkX)

  const openIds = useMemo(() => new Set(dockWindows.map((w) => w.id)), [dockWindows])
  const activeKeys = useMemo(() => {
    const keys = new Set()
    dockWindows.filter((w) => !w.minimized).forEach((w) => keys.add(`g-${w.id}`))
    return keys
  }, [dockWindows])

  const items = useMemo(() => dockShortcuts.map((g) => ({
    key: `g-${g.id}`,
    id: g.id,
    groupId: g.id,
    title: g.display_name || g.name,
    is_direct: g.is_direct,
    pinned: g.pinned,
    unread: g.unread || 0,
    last_message: g.last_message,
    lastMessageAt: g.last_message_at,
    kind: g.is_direct ? 'direct' : 'group',
  })), [dockShortcuts])

  const pinnedItems = items.filter((i) => i.pinned)
  const regularItems = items.filter((i) => !i.pinned).slice(0, MAX_STRIP)
  const overflow = Math.max(0, items.filter((i) => !i.pinned).length - MAX_STRIP)

  const q = search.trim().toLowerCase()
  const recentFiltered = q
    ? items.filter((i) => i.title.toLowerCase().includes(q))
    : items.slice(0, 20)
  const groupFiltered = q
    ? items.filter((i) => !i.is_direct && i.title.toLowerCase().includes(q))
    : items.filter((i) => !i.is_direct).slice(0, 10)
  // Luôn hiện liên hệ gợi ý (trước đây chỉ hiện khi đang tìm → trống thì không chat được)
  const staffFiltered = q
    ? contacts.filter((c) => (c.full_name || c.email || '').toLowerCase().includes(q))
    : contacts.slice(0, 24)

  const startDirect = useCallback(async (peerId) => {
    if (!peerId || startingChat) return
    setStartingChat(peerId)
    try {
      const g = await messengerService.createDirect(peerId)
      await refreshGroups()
      openDock(g)
      setDockPanelOpen(false)
      setSearch('')
    } catch (err) {
      console.error('createDirect', err)
      window.alert(err.response?.data?.message || err.message || 'Không mở được chat')
    } finally {
      setStartingChat(null)
    }
  }, [startingChat, refreshGroups, openDock, setDockPanelOpen])

  useEffect(() => {
    if (!dockPanelOpen) return
    setContactsLoading(true)
    messengerService.listContacts()
      .then((list) => setContacts(Array.isArray(list) ? list : []))
      .catch((err) => {
        console.error('listContacts', err)
        setContacts([])
      })
      .finally(() => setContactsLoading(false))
  }, [dockPanelOpen])

  useEffect(() => {
    if (dockPanelOpen) setRaised(true)
  }, [dockPanelOpen])

  useEffect(() => () => {
    clearTimeout(leaveTimer.current)
    clearTimeout(hoverTimer.current)
  }, [])

  const handleEnter = () => {
    clearTimeout(leaveTimer.current)
    setRaised(true)
  }

  const handleLeave = () => {
    if (dockPinned || hoverItem) return
    clearTimeout(leaveTimer.current)
    leaveTimer.current = setTimeout(() => {
      if (!dockPanelOpen) setRaised(false)
    }, 340)
  }

  const togglePanel = () => setDockPanelOpen(!dockPanelOpen)
  const closePanel = () => {
    setDockPanelOpen(false)
    setSearch('')
  }

  const toggleDockPinned = () => {
    setDockPinned((v) => {
      const next = !v
      if (next) setRaised(true)
      try { localStorage.setItem(DOCK_PINNED_KEY, next ? '1' : '0') } catch { /* ignore */ }
      return next
    })
  }

  const toggleAvatarsCollapsed = () => {
    setAvatarsCollapsed((v) => {
      const next = !v
      try { localStorage.setItem(DOCK_COLLAPSED_KEY, next ? '1' : '0') } catch { /* ignore */ }
      return next
    })
  }

  const handleOpen = (item) => {
    const g = dockShortcuts.find((x) => x.id === item.id)
    if (g) openDock(g)
    setHoverItem(null)
  }

  const showHover = (item, el) => {
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => {
      if (el) setHoverRect(el.getBoundingClientRect())
      setHoverItem(item)
      setRaised(true)
    }, 400)
  }

  const hideHover = () => {
    clearTimeout(hoverTimer.current)
    setHoverItem(null)
    setHoverRect(null)
  }

  const renderStripBtn = (item, { pinnedStrip = false } = {}) => {
    const isActive = activeKeys.has(item.key) || openIds.has(item.id)
    const canPin = !!item.groupId

    return (
      <div key={item.key} className="relative shrink-0 group/dock-item" style={{ padding: 6 }}>
        <button
          type="button"
          onClick={() => handleOpen(item)}
          onContextMenu={canPin ? (e) => { e.preventDefault(); togglePin(item.id) } : undefined}
          onMouseEnter={(e) => showHover(item, e.currentTarget)}
          onMouseLeave={hideHover}
          className="relative block transition-transform duration-300 hover:scale-105 rounded-2xl"
          title={item.title}
        >
          {item.kind === 'group' && !item.is_direct ? (
            <span
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm ${
                isActive ? 'ring-2 ring-blue-500' : 'ring-2 ring-white'
              }`}
              style={{ background: bubbleGradient(item.title) }}
            >
              <Users className="h-4 w-4" />
            </span>
          ) : (
            <DockAvatar
              name={item.title}
              active={isActive}
              ringClass={item.pinned && !isActive ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-white' : ''}
            />
          )}
          <UnreadBadge count={item.unread} prominent={item.unread > 0} pulseRing={item.unread > 0 && !dockActive} />
        </button>
        {canPin && item.pinned && (
          <span className="absolute -top-0.5 -left-0.5 z-20 h-3.5 w-3.5 rounded-full bg-amber-500 flex items-center justify-center ring-1 ring-white">
            <Pin className="h-2 w-2 text-white fill-white" />
          </span>
        )}
      </div>
    )
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <HoverCard
        item={hoverItem}
        anchorRect={hoverRect}
        onPin={togglePin}
        onClose={hideHover}
      />

      <div
        ref={dockRef}
        className="fixed top-1/2 -translate-y-1/2 z-[120] flex flex-row-reverse items-stretch gap-3 overflow-visible"
        style={{ right: DOCK_RIGHT }}
        onMouseLeave={handleLeave}
      >
        {/* Panel trái — mở cạnh thanh dock */}
        {dockPanelOpen && (
          <div
            ref={panelRef}
            className="w-[320px] shrink-0 flex flex-col rounded-3xl border border-slate-200 bg-white overflow-hidden max-h-[min(72vh,640px)]"
            style={{ boxShadow: DOCK_SHADOW }}
          >
            <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-200 bg-gradient-to-br from-blue-500/5 via-white to-violet-500/5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Chat nhanh</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Giáo viên, học sinh & nhóm lớp</p>
                </div>
                <button type="button" onClick={closePanel} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm người, nhóm…"
                  className="w-full text-sm border border-slate-200 rounded-2xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-4 [scrollbar-width:thin]">
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <UserPlus className="h-3 w-3" /> {q ? 'Kết quả liên hệ' : 'Bắt đầu chat'}
                </h3>
                {contactsLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải…
                  </div>
                ) : staffFiltered.length ? (
                  <ul className="space-y-1">
                    {staffFiltered.map((u) => (
                      <li key={u.id}>
                        <button
                          type="button"
                          disabled={!!startingChat}
                          onClick={() => startDirect(u.id)}
                          className="w-full text-left px-2.5 py-2 rounded-2xl hover:bg-blue-50 flex items-center gap-2.5 transition group disabled:opacity-60"
                        >
                          <DockAvatar name={u.full_name} />
                          <span className="min-w-0 flex-1">
                            <span className="text-sm font-medium text-slate-800 block truncate">{u.full_name}</span>
                            <span className="text-[11px] text-slate-500 block truncate">{contactSubtitle(u)}</span>
                          </span>
                          {startingChat === u.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 py-2 text-center">
                    {q ? 'Không có kết quả' : 'Chưa có liên hệ để nhắn tin'}
                  </p>
                )}
              </section>

              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <MessageCircle className="h-3 w-3" /> Hội thoại gần đây
                </h3>
                {loadingGroups ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải…
                  </div>
                ) : recentFiltered.length ? (
                  <ul className="space-y-1">
                    {recentFiltered.map((item) => {
                      const isActive = activeKeys.has(item.key)
                      return (
                        <li key={item.key}>
                          <button
                            type="button"
                            onClick={() => { handleOpen(item); closePanel() }}
                            className={`w-full text-left px-2.5 py-2 rounded-2xl flex items-center gap-2.5 transition group ${
                              isActive ? 'bg-gradient-to-r from-blue-500/10 to-sky-500/10 ring-1 ring-blue-500/20' : 'hover:bg-slate-50'
                            }`}
                          >
                            <DockAvatar name={item.title} active={isActive} />
                            <span className="min-w-0 flex-1">
                              <span className="text-sm font-medium text-slate-800 flex items-center gap-1 truncate">
                                {item.pinned && <Pin className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                                {item.title}
                              </span>
                              {item.last_message ? (
                                <PreviewLine text={item.last_message} unread={item.unread} />
                              ) : (
                                <span className="text-[11px] text-slate-500">{item.is_direct ? 'Trực tiếp' : 'Nhóm'}</span>
                              )}
                            </span>
                            {item.unread > 0 ? (
                              <UnreadBadge count={item.unread} prominent />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 shrink-0" />
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 py-2 text-center">
                    Chưa có hội thoại — chọn người ở mục trên để bắt đầu
                  </p>
                )}
              </section>

              {!q && groupFiltered.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Users className="h-3 w-3" /> Nhóm chat
                    </h3>
                    <Link to="/messenger" onClick={closePanel} className="text-[11px] font-semibold text-blue-600 flex items-center gap-0.5">
                      <UserPlus className="h-3 w-3" /> Tạo nhóm
                    </Link>
                  </div>
                  <ul className="space-y-1">
                    {groupFiltered.map((item) => (
                      <li key={item.key}>
                        <button
                          type="button"
                          onClick={() => { handleOpen(item); closePanel() }}
                          className="w-full text-left px-2.5 py-2 rounded-2xl hover:bg-slate-50 flex items-center gap-2.5 group"
                        >
                          <span className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: bubbleGradient(item.title) }}>
                            <Users className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 text-sm font-medium text-slate-800 truncate">{item.title}</span>
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <Link
                to="/messenger"
                onClick={closePanel}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition"
              >
                <MessageCircle className="h-4 w-4" />
                Mở trang chat đầy đủ
              </Link>
            </div>
          </div>
        )}

        {/* Compact dock — mép phải, căn giữa dọc */}
        <div
          className="flex flex-col items-center gap-1.5 shrink-0 overflow-visible transition-transform duration-500 ease-out"
          style={{ transform: `translateX(${pinnedSinkX}px)` }}
        >
          {pinnedItems.length > 0 && (
            <div className="flex flex-col items-center gap-1 py-0.5" onMouseEnter={handleEnter}>
              {pinnedItems.map((item) => renderStripBtn(item, { pinnedStrip: true }))}
            </div>
          )}

          <div
            onMouseEnter={handleEnter}
            className={`relative flex flex-col items-center rounded-3xl border py-3 gap-2 overflow-visible transition-all duration-500 ${
              dockActive
                ? 'border-slate-200 bg-white px-2.5'
                : totalUnread > 0
                  ? 'border-red-200 bg-white shadow-[0_0_0_2px_rgba(239,68,68,0.2)] px-2.5'
                  : 'border-transparent bg-white/75 backdrop-blur-sm px-2'
            }`}
            style={{
              width: compactOuter,
              opacity: dockActive ? 1 : totalUnread > 0 ? 0.94 : 0.58,
              boxShadow: dockActive ? DOCK_SHADOW : totalUnread > 0 ? '0 8px 28px rgba(239,68,68,0.2)' : DOCK_SHADOW_SUNK,
              transform: `translateX(${mainSinkX}px)`,
            }}
          >
            <button
              type="button"
              onClick={togglePanel}
              className={`relative w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                dockPanelOpen
                  ? 'bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-md scale-95'
                  : totalUnread > 0 && !dockActive
                    ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg ring-2 ring-red-300 animate-pulse'
                    : dockActive
                      ? 'bg-slate-50 text-blue-600 hover:bg-gradient-to-br hover:from-blue-600 hover:to-violet-600 hover:text-white'
                      : 'bg-white/90 text-blue-600/80 shadow-sm'
              }`}
              title={dockPanelOpen ? 'Thu gọn' : `${totalUnread} tin mới`}
            >
              <MessageCircle className="h-5 w-5" />
              {dockPinned && !dockPanelOpen && (
                <span className="absolute bottom-0 left-0 h-3.5 w-3.5 rounded-full bg-amber-500 flex items-center justify-center ring-1 ring-white">
                  <Pin className="h-2 w-2 text-white fill-white" />
                </span>
              )}
              {!dockPanelOpen && totalUnread > 0 && (
                <UnreadBadge count={totalUnread} prominent pulseRing={!dockActive} />
              )}
            </button>

            <div className="flex flex-col items-center gap-0.5" style={{ opacity: dockActive ? 1 : 0.78 }}>
              <button
                type="button"
                onClick={toggleDockPinned}
                className={`w-8 h-7 rounded-lg flex items-center justify-center transition ${
                  dockPinned ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                }`}
                title={dockPinned ? 'Bỏ ghim thanh chat' : 'Ghim cố định — không tự chìm'}
              >
                <Pin className={`h-3.5 w-3.5 ${dockPinned ? 'fill-current' : ''}`} />
              </button>
              <button
                type="button"
                onClick={toggleAvatarsCollapsed}
                className="w-8 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                title={avatarsCollapsed ? 'Mở rộng avatar' : 'Thu gọn avatar'}
              >
                {avatarsCollapsed ? <PanelRightOpen className="h-3.5 w-3.5" /> : <PanelRightClose className="h-3.5 w-3.5" />}
              </button>
            </div>

            {!avatarsCollapsed && (
              <>
                <div className={`w-8 border-t shrink-0 ${dockActive ? 'border-slate-200' : 'border-slate-200/60'}`} />
                <div ref={stripRef} className="flex flex-col items-center gap-1 w-full max-h-[min(340px,42vh)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-1">
                  {loadingGroups && items.length === 0 && (
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400 my-2" />
                  )}
                  {regularItems.map((item) => renderStripBtn(item))}
                  {overflow > 0 && (
                    <button
                      type="button"
                      onClick={togglePanel}
                      className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 shrink-0"
                    >
                      +{overflow}
                    </button>
                  )}
                  {!loadingGroups && items.length === 0 && (
                    <button
                      type="button"
                      onClick={togglePanel}
                      className="w-full px-1 py-2 rounded-xl text-[9px] font-semibold text-primary-700 bg-primary-50 border border-primary-100 hover:bg-primary-100 transition"
                      title="Mở danh bạ để bắt đầu chat"
                    >
                      + Chat mới
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}

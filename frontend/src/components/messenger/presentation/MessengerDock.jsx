/**
 * Presentation — cửa sổ bong bóng chat (layout QLCV: xếp ngang trái thanh dock).
 */
import { useMemo, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { X, Minus, Maximize2, Pin, Users } from 'lucide-react'
import { useMessenger } from '../../../context/MessengerContext'
import { bubbleGradient, initials } from '../../../lib/messengerUtils'
import ChatPanel from './ChatPanel'
import MessengerQuickChatDock, { DOCK_VISUAL_W, PANEL_W, DOCK_RIGHT } from './MessengerQuickChatDock'

const BUBBLE_W = 340
const BUBBLE_GAP = 12
const BUBBLE_MAX_H = 520
const VIEWPORT_MARGIN = 8
const PANEL_GAP = 12
const Z_BUBBLE = 100

function useViewport() {
  const [size, setSize] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 720,
  }))
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return size
}

function computeLayout(index, viewport, panelOpen) {
  const margin = VIEWPORT_MARGIN
  const dockOffset = DOCK_RIGHT + DOCK_VISUAL_W + (panelOpen ? PANEL_W + PANEL_GAP : 0) + BUBBLE_GAP
  const bubbleH = Math.min(BUBBLE_MAX_H, viewport.h - margin * 2)
  const slotW = BUBBLE_W + BUBBLE_GAP
  const maxRight = viewport.w - margin - BUBBLE_W
  const availableW = Math.max(slotW, maxRight - dockOffset - BUBBLE_GAP)
  const cols = Math.max(1, Math.floor(availableW / slotW))
  const col = index % cols
  const row = Math.floor(index / cols)
  const right = dockOffset + col * slotW
  const rowLift = Math.min(72, Math.max(28, Math.floor(bubbleH * 0.12)))
  let bottom = margin + row * rowLift
  const bubbleTop = viewport.h - bottom - bubbleH
  if (bubbleTop < margin) {
    bottom = Math.max(margin, viewport.h - bubbleH - margin)
  }
  return { right, bottom, height: bubbleH, zIndex: Z_BUBBLE + index }
}

function HeaderAvatar({ name }) {
  return (
    <div
      className="w-9 h-9 rounded-2xl flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ring-white/40 shadow-md"
      style={{ background: bubbleGradient(name) }}
    >
      {initials(name, 2)}
    </div>
  )
}

export default function MessengerDock() {
  const {
    dockWindows, closeDock, toggleMinimize, togglePin, pinnedGroupIds, typingByGroup, dockPanelOpen,
  } = useMessenger()
  const viewport = useViewport()

  const expanded = useMemo(() => dockWindows.filter((w) => !w.minimized), [dockWindows])
  const minimized = useMemo(() => dockWindows.filter((w) => w.minimized), [dockWindows])
  const pinSet = useMemo(() => new Set(pinnedGroupIds.map(String)), [pinnedGroupIds])

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      {expanded.map((w, i) => {
        const layout = computeLayout(i, viewport, dockPanelOpen)
        const title = w.name || 'Chat'
        const gradient = bubbleGradient(title)
        const typing = typingByGroup[w.id]
        const pinned = pinSet.has(String(w.id))

        return (
          <div
            key={w.id}
            className="fixed flex flex-col rounded-2xl border border-white/40 bg-white/95 backdrop-blur-xl shadow-2xl overflow-hidden ring-1 ring-black/5"
            style={{
              zIndex: layout.zIndex,
              width: BUBBLE_W,
              height: layout.height,
              right: layout.right,
              bottom: layout.bottom,
            }}
          >
            <div
              className="relative shrink-0 flex items-center gap-2.5 px-3 py-2.5 text-white"
              style={{ background: gradient }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-black/10 pointer-events-none" />
              <HeaderAvatar name={title} />
              <div className="relative flex-1 min-w-0">
                <p className="text-[13px] font-bold truncate drop-shadow-sm">{title}</p>
                <p className="text-[10px] text-white/85 truncate flex items-center gap-1">
                  {typing ? (
                    <span className="animate-pulse">{typing} đang nhập…</span>
                  ) : w.is_direct ? (
                    'Chat trực tiếp'
                  ) : (
                    <>
                      <Users className="h-2.5 w-2.5" />
                      {w.class_id ? 'Chat lớp học' : 'Nhóm chat'}
                    </>
                  )}
                </p>
              </div>
              <div className="relative flex items-center gap-0.5 shrink-0">
                <button type="button" onClick={() => toggleMinimize(w.id)} className="p-1.5 rounded-lg hover:bg-white/20" title="Thu nhỏ">
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => togglePin(w.id)}
                  className={`p-1.5 rounded-lg transition ${pinned ? 'bg-white/25' : 'hover:bg-white/20'}`}
                  title={pinned ? 'Bỏ ghim' : 'Ghim'}
                >
                  <Pin className={`h-4 w-4 ${pinned ? 'fill-current' : ''}`} />
                </button>
                <Link to={`/messenger?group=${w.id}`} className="p-1.5 rounded-lg hover:bg-white/20" title="Mở trang chat">
                  <Maximize2 className="h-4 w-4" />
                </Link>
                <button type="button" onClick={() => closeDock(w.id)} className="p-1.5 rounded-lg hover:bg-white/20" title="Đóng">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 flex flex-col bg-gradient-to-b from-slate-50/80 to-white/60">
              <ChatPanel
                group={{ id: w.id, name: w.name, display_name: w.name, is_direct: w.is_direct }}
                compact
                embedded
              />
            </div>
          </div>
        )
      })}

      {/* Bong bóng thu nhỏ — xếp dọc cạnh thanh dock (giữa màn hình) */}
      {minimized.length > 0 && (
        <div
          className="fixed z-[98] flex flex-col-reverse items-center gap-2"
          style={{
            right: DOCK_RIGHT + (DOCK_VISUAL_W - 44) / 2,
            top: '50%',
            transform: 'translateY(calc(-50% - 120px))',
          }}
        >
          {minimized.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => toggleMinimize(w.id)}
              title={`Mở lại: ${w.name}`}
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-xs font-bold shadow-lg ring-2 ring-white hover:scale-105 transition-transform"
              style={{ background: bubbleGradient(w.name) }}
            >
              {initials(w.name, 2)}
            </button>
          ))}
        </div>
      )}

      <MessengerQuickChatDock />
    </>,
    document.body,
  )
}

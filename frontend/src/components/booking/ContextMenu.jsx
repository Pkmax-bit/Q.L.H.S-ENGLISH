import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

/**
 * Menu chuột phải.
 *
 * Mở bằng cách gọi `open(event, payload)` từ handler onContextMenu, rồi đọc
 * `payload` trong từng mục. Tự né mép màn hình vì menu mở sát cạnh phải/dưới sẽ
 * bị cắt mất nửa — lúc đó người dùng không bấm được mục nào.
 *
 * Trả về cả phần tử menu lẫn hàm mở, dùng qua hook `useContextMenu`.
 */
export default function ContextMenu({ state, onClose, items = [] }) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!state) return undefined
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onClose, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onClose, true)
    }
  }, [state, onClose])

  // Né mép màn hình sau khi đã biết kích thước thật của menu
  useEffect(() => {
    if (!state) return
    const el = ref.current
    const w = el?.offsetWidth || 200
    const h = el?.offsetHeight || 160
    setPos({
      x: Math.min(state.x, window.innerWidth - w - 8),
      y: Math.min(state.y, window.innerHeight - h - 8),
    })
  }, [state])

  if (!state) return null

  const visible = items.filter((it) => !it.hidden)

  return (
    <div
      ref={ref}
      role="menu"
      style={{ left: pos.x, top: pos.y }}
      className="fixed z-[60] min-w-[190px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10"
    >
      {state.payload?.title && (
        <p className="truncate border-b border-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-400">
          {state.payload.title}
        </p>
      )}
      {visible.map((item, i) =>
        item.separator ? (
          <div key={`sep-${i}`} className="my-1 h-px bg-slate-100" />
        ) : (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              onClose()
              item.onClick?.(state.payload)
            }}
            className={clsx(
              'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors',
              item.danger
                ? 'text-red-600 hover:bg-red-50'
                : 'text-slate-700 hover:bg-primary-50 hover:text-primary-700',
              item.disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent'
            )}
          >
            {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
            {item.label}
          </button>
        )
      )}
    </div>
  )
}

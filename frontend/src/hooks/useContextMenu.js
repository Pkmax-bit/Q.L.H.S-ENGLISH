import { useState } from 'react'

/**
 * Mở menu chuột phải: gọi `open(event, payload)` trong handler onContextMenu,
 * rồi đọc `payload` ở từng mục menu.
 *
 * Để riêng file vì ContextMenu.jsx chỉ nên export component — Vite fast refresh
 * mất tác dụng với file vừa export component vừa export hàm.
 */
export function useContextMenu() {
  const [state, setState] = useState(null) // { x, y, payload }

  const open = (event, payload) => {
    event.preventDefault()
    event.stopPropagation()
    setState({ x: event.clientX, y: event.clientY, payload })
  }

  return { state, open, close: () => setState(null) }
}

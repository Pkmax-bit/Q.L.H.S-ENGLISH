import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

/**
 * Một socket dùng chung cho cả trang bảng đăng ký.
 *
 * Mở MỘT kết nối rồi chia cho lưới và hộp chat, thay vì mỗi thành phần tự mở:
 * hai socket cùng một người thì server đếm đôi, và mỗi lần một thành phần
 * render lại là nối/ngắt một lần.
 *
 * `bookingToken` cho phiên công khai (chỉ có số điện thoại), `token` cho tài
 * khoản nội bộ — server nhận cả hai nhưng bằng hai secret khác nhau.
 *
 * Vào phòng bảng ngay khi nối được VÀ mỗi lần nối lại: mạng rớt rồi lên lại
 * thì socket.io tự nối nhưng KHÔNG tự vào lại phòng, không gắn vào 'connect'
 * là im lặng mất hết sự kiện từ đó về sau.
 */
export function useBookingSocket({ bookingToken, token, boardId, isManager = false }) {
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!bookingToken && !token) return undefined

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001', {
      auth: bookingToken ? { bookingToken } : { token },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    const join = () => {
      setConnected(true)
      if (boardId) socket.emit('booking:join_board', boardId)
      if (isManager && boardId) socket.emit('booking:join_manager', boardId)
    }
    socket.on('connect', join)
    socket.on('disconnect', () => setConnected(false))

    return () => {
      socket.off('connect', join)
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [bookingToken, token, boardId, isManager])

  return { socket: socketRef, connected }
}

import { useEffect, useState } from 'react'
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
 *
 * Trả socket qua STATE chứ không qua ref. Ref không làm component vẽ lại, nên
 * effect bên ngoài chạy đúng một lần lúc mới gắn — mà lúc đó socket còn là
 * null (effect của con chạy trước effect của cha). Kết quả: không ai nghe
 * được gì cả, chat phải chờ vòng hỏi lại. Dùng state thì socket vừa tạo xong
 * là mọi nơi nghe nó được gắn lại ngay.
 */
export function useBookingSocket({ bookingToken, token, boardId, isManager = false }) {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!bookingToken && !token) return undefined

    const sock = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001', {
      auth: bookingToken ? { bookingToken } : { token },
      transports: ['websocket', 'polling'],
    })
    setSocket(sock)

    const join = () => {
      setConnected(true)
      if (boardId) sock.emit('booking:join_board', boardId)
      if (isManager && boardId) sock.emit('booking:join_manager', boardId)
    }
    sock.on('connect', join)
    sock.on('disconnect', () => setConnected(false))

    return () => {
      sock.off('connect', join)
      sock.disconnect()
      setSocket(null)
      setConnected(false)
    }
  }, [bookingToken, token, boardId, isManager])

  return { socket, connected }
}

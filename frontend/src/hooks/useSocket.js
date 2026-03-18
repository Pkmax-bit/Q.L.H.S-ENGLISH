import { useEffect, useContext } from 'react'
import { SocketContext } from '../context/SocketContext'

export function useSocket(event, callback) {
  const socket = useContext(SocketContext)

  useEffect(() => {
    if (!socket || !event || !callback) return

    socket.on(event, callback)

    return () => {
      socket.off(event, callback)
    }
  }, [socket, event, callback])

  return socket
}

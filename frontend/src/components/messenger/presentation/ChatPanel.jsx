/**
 * Presentation — panel chat realtime (tin nhắn + composer).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useSocket } from '../../../hooks/useSocket'
import { useMessenger } from '../../../context/MessengerContext'
import messengerService from '../../../services/messenger.service'
import ChatBubble from './ChatBubble'
import ChatComposer from './ChatComposer'

export default function ChatPanel({ group, compact = false, embedded = false, onMessagesChange }) {
  const { user } = useAuth()
  const socket = useSocket()
  const { clearUnread, emitTyping, joinGroup, typingByGroup } = useMessenger()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)
  const groupId = group?.id

  const scrollBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    try {
      const rows = await messengerService.getMessages(groupId)
      setMessages(rows || [])
      clearUnread(groupId)
    } catch (err) {
      console.error('load chat', err)
    } finally {
      setLoading(false)
    }
  }, [groupId, clearUnread])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    if (!groupId) return
    joinGroup(groupId)
    clearUnread(groupId)
  }, [groupId, joinGroup, clearUnread])

  useEffect(() => {
    onMessagesChange?.(messages)
  }, [messages, onMessagesChange])

  useEffect(() => {
    scrollBottom()
  }, [messages.length])

  useEffect(() => {
    if (!socket || !groupId) return

    const onChat = (msg) => {
      if (msg.group_id !== groupId) return
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      if (String(msg.user_id) !== String(user?.id)) {
        clearUnread(groupId)
      }
    }

    socket.on('messenger_group:chat', onChat)
    return () => socket.off('messenger_group:chat', onChat)
  }, [socket, groupId, user?.id, clearUnread])

  const handleSend = async (content, file) => {
    if (!groupId) return
    let msg
    if (file) msg = await messengerService.sendFile(groupId, file, content)
    else msg = await messengerService.sendMessage(groupId, content)
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev
      return [...prev, msg]
    })
  }

  const typingLabel = typingByGroup[groupId]
  const isGroup = !group?.is_direct

  return (
    <div className={`flex flex-col ${embedded ? 'h-full' : compact ? 'h-full' : 'h-[min(70vh,640px)]'} ${
      embedded ? '' : 'bg-white/40 backdrop-blur-sm rounded-2xl border border-amber-200/50'
    } overflow-hidden`}>
      {!embedded && (
        <div className="px-4 py-3 border-b border-amber-200/40 bg-white/60 backdrop-blur-md">
          <h3 className="font-semibold text-stone-900 truncate">{group?.display_name || group?.name}</h3>
          {typingLabel && (
            <p className="text-xs text-amber-700 mt-0.5 animate-pulse">{typingLabel} đang nhập…</p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-stone-400 py-12">Chưa có tin nhắn. Hãy bắt đầu trò chuyện!</p>
        ) : (
          messages.map((m) => (
            <ChatBubble
              key={m.id}
              message={m}
              viewerId={user?.id}
              showSender={isGroup}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <ChatComposer
        onSend={handleSend}
        onTyping={(v) => emitTyping(groupId, v)}
      />
    </div>
  )
}

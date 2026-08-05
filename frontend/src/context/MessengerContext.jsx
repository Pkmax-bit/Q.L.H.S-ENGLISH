/**
 * Controller — quản lý state chat, socket rooms, bong bóng dock (theo QLCV MessengerDockContext).
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react'
import { useAuth } from '../hooks/useAuth'
import { useSocket } from '../hooks/useSocket'
import messengerService from '../services/messenger.service'
import { loadPinnedGroups, savePinnedGroups } from '../lib/messengerUtils'

const MessengerContext = createContext(null)
const MAX_DOCK_WINDOWS = 4

function focusWindow(windows, id) {
  const hit = windows.find((w) => w.id === id)
  if (!hit) return windows
  return [hit, ...windows.filter((w) => w.id !== id)]
}

export function MessengerProvider({ children }) {
  const { user } = useAuth()
  const socket = useSocket()
  const uid = user?.id

  const [groups, setGroups] = useState([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [unreadByGroup, setUnreadByGroup] = useState({})
  const [typingByGroup, setTypingByGroup] = useState({})
  const [dockWindows, setDockWindows] = useState([])
  const [pinnedGroupIds, setPinnedGroupIds] = useState(() => loadPinnedGroups(uid))
  const [dockPanelOpen, setDockPanelOpen] = useState(false)
  const joinedRef = useRef(new Set())
  const dockWindowsRef = useRef([])

  useEffect(() => {
    dockWindowsRef.current = dockWindows
  }, [dockWindows])

  useEffect(() => {
    setPinnedGroupIds(loadPinnedGroups(uid))
  }, [uid])

  const refreshGroups = useCallback(async () => {
    if (!uid) return
    setLoadingGroups(true)
    try {
      const list = await messengerService.listGroups()
      setGroups(list || [])
      const unread = {}
      for (const g of list || []) {
        if (g.unread_count > 0) unread[g.id] = g.unread_count
      }
      setUnreadByGroup((prev) => ({ ...unread, ...prev }))
    } catch (err) {
      console.error('load messenger groups', err)
    } finally {
      setLoadingGroups(false)
    }
  }, [uid])

  useEffect(() => {
    refreshGroups()
  }, [refreshGroups])

  const joinGroup = useCallback((groupId) => {
    if (!socket || !groupId || joinedRef.current.has(groupId)) return
    socket.emit('join:messenger_group', groupId)
    joinedRef.current.add(groupId)
  }, [socket])

  const leaveGroup = useCallback((groupId) => {
    if (!socket || !groupId) return
    socket.emit('leave:messenger_group', groupId)
    joinedRef.current.delete(groupId)
  }, [socket])

  useEffect(() => {
    if (!socket || !groups.length) return
    groups.forEach((g) => joinGroup(g.id))
    return () => {
      groups.forEach((g) => leaveGroup(g.id))
    }
  }, [socket, groups, joinGroup, leaveGroup])

  useEffect(() => {
    if (!socket) return

    const onChat = (msg) => {
      if (!msg?.group_id) return
      setGroups((prev) => {
        const next = prev.map((g) => {
          if (g.id !== msg.group_id) return g
          return {
            ...g,
            last_message: msg.content || (msg.attachment_url ? '📎 Tệp đính kèm' : g.last_message),
            last_message_at: msg.created_at,
            last_user_id: msg.user_id,
          }
        })
        next.sort((a, b) => new Date(b.last_message_at || b.created_at) - new Date(a.last_message_at || a.created_at))
        return next
      })

      setDockWindows((prev) => prev.map((w) => (
        w.id === msg.group_id
          ? {
            ...w,
            last_message: msg.content || (msg.attachment_url ? '📎 Tệp' : w.last_message),
            last_message_at: msg.created_at,
          }
          : w
      )))

      if (String(msg.user_id) !== String(uid)) {
        const expanded = dockWindowsRef.current.find((w) => w.id === msg.group_id && !w.minimized)
        if (!expanded) {
          setUnreadByGroup((prev) => ({
            ...prev,
            [msg.group_id]: (prev[msg.group_id] || 0) + 1,
          }))
        }
      }
    }

    const onRead = ({ group_id }) => {
      if (group_id) {
        setUnreadByGroup((prev) => {
          const next = { ...prev }
          delete next[group_id]
          return next
        })
      }
    }

    const onTyping = ({ group_id, user_id, full_name, is_typing }) => {
      if (!group_id || String(user_id) === String(uid)) return
      setTypingByGroup((prev) => {
        const next = { ...prev }
        if (is_typing) next[group_id] = full_name || 'Ai đó'
        else delete next[group_id]
        return next
      })
      if (is_typing) {
        setTimeout(() => {
          setTypingByGroup((prev) => {
            const next = { ...prev }
            delete next[group_id]
            return next
          })
        }, 4000)
      }
    }

    socket.on('messenger_group:chat', onChat)
    socket.on('messenger_group:read', onRead)
    socket.on('messenger_group:typing', onTyping)

    return () => {
      socket.off('messenger_group:chat', onChat)
      socket.off('messenger_group:read', onRead)
      socket.off('messenger_group:typing', onTyping)
    }
  }, [socket, uid])

  const toDockWindow = useCallback((group) => ({
    id: group.id,
    name: group.display_name || group.name,
    is_direct: !!group.is_direct,
    peer_avatar: group.peer_avatar || group.avatar || null,
    class_id: group.class_id || null,
    last_message: group.last_message,
    last_message_at: group.last_message_at,
    minimized: false,
  }), [])

  const openDock = useCallback((group, { markRead = true } = {}) => {
    if (!group?.id) return
    if (markRead) {
      setUnreadByGroup((prev) => {
        const next = { ...prev }
        delete next[group.id]
        return next
      })
      messengerService.markRead(group.id).catch(() => {})
    }
    setDockWindows((prev) => {
      const hit = prev.find((w) => w.id === group.id)
      let next
      if (hit) {
        next = prev.map((w) => (
          w.id === group.id ? { ...w, ...toDockWindow(group), minimized: false } : w
        ))
      } else {
        next = [toDockWindow(group), ...prev]
      }
      return focusWindow(next, group.id).slice(0, MAX_DOCK_WINDOWS)
    })
    joinGroup(group.id)
  }, [joinGroup, toDockWindow])

  const closeDock = useCallback((groupId) => {
    setDockWindows((prev) => prev.filter((w) => w.id !== groupId))
  }, [])

  const toggleMinimize = useCallback((groupId) => {
    setDockWindows((prev) => prev.map((w) => (
      w.id === groupId ? { ...w, minimized: !w.minimized } : w
    )))
  }, [])

  const togglePin = useCallback((groupId) => {
    setPinnedGroupIds((prev) => {
      const set = new Set(prev.map(String))
      const key = String(groupId)
      if (set.has(key)) set.delete(key)
      else set.add(key)
      const next = [...set]
      savePinnedGroups(uid, next)
      return next
    })
  }, [uid])

  const clearUnread = useCallback((groupId) => {
    setUnreadByGroup((prev) => {
      const next = { ...prev }
      delete next[groupId]
      return next
    })
    messengerService.markRead(groupId).catch(() => {})
  }, [])

  const emitTyping = useCallback((groupId, isTyping) => {
    if (!socket || !groupId) return
    socket.emit('messenger_group:typing', { group_id: groupId, is_typing: isTyping })
  }, [socket])

  const totalUnread = useMemo(
    () => Object.values(unreadByGroup).reduce((s, n) => s + (Number(n) || 0), 0),
    [unreadByGroup],
  )

  const dockShortcuts = useMemo(() => {
    const pinSet = new Set(pinnedGroupIds.map(String))
    const openIds = new Set(dockWindows.map((w) => w.id))
    const sorted = [...groups].sort((a, b) => {
      const aPin = pinSet.has(String(a.id))
      const bPin = pinSet.has(String(b.id))
      if (aPin !== bPin) return aPin ? -1 : 1
      const aUnread = unreadByGroup[a.id] || 0
      const bUnread = unreadByGroup[b.id] || 0
      if (aUnread !== bUnread) return bUnread - aUnread
      return new Date(b.last_message_at || b.created_at) - new Date(a.last_message_at || a.created_at)
    })
    const items = sorted.slice(0, 12).map((g) => ({
      ...g,
      pinned: pinSet.has(String(g.id)),
      isOpen: openIds.has(g.id),
      unread: unreadByGroup[g.id] || g.unread_count || 0,
    }))
    return items
  }, [groups, pinnedGroupIds, dockWindows, unreadByGroup])

  const value = useMemo(() => ({
    groups,
    loadingGroups,
    refreshGroups,
    unreadByGroup,
    totalUnread,
    typingByGroup,
    dockWindows,
    dockShortcuts,
    pinnedGroupIds,
    dockPanelOpen,
    setDockPanelOpen,
    openDock,
    closeDock,
    toggleMinimize,
    togglePin,
    clearUnread,
    emitTyping,
    joinGroup,
    createDirect: messengerService.createDirect,
    createGroup: messengerService.createGroup,
    ensureClassChat: messengerService.ensureClassChat,
  }), [
    groups, loadingGroups, refreshGroups, unreadByGroup, totalUnread, typingByGroup,
    dockWindows, dockShortcuts, pinnedGroupIds, dockPanelOpen,
    openDock, closeDock, toggleMinimize,
    togglePin, clearUnread, emitTyping, joinGroup,
  ])

  return (
    <MessengerContext.Provider value={value}>
      {children}
    </MessengerContext.Provider>
  )
}

export function useMessenger() {
  const ctx = useContext(MessengerContext)
  if (!ctx) throw new Error('useMessenger must be used within MessengerProvider')
  return ctx
}

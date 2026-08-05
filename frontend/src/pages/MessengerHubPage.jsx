import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MessageCircle, Plus, Search, UserPlus, Loader2 } from 'lucide-react'
import { useMessenger } from '../context/MessengerContext'
import messengerService from '../services/messenger.service'
import { roleLabel, contactSubtitle } from '../lib/messengerUtils'
import MessengerThreadList from '../components/messenger/presentation/MessengerThreadList'
import ChatPanel from '../components/messenger/presentation/ChatPanel'
import Modal from '../components/common/Modal'
import Button from '../components/common/Button'
import Input from '../components/common/Input'

export default function MessengerHubPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    groups, loadingGroups, refreshGroups, unreadByGroup, openDock, createDirect, createGroup,
  } = useMessenger()

  const [activeGroup, setActiveGroup] = useState(null)
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [contacts, setContacts] = useState([])
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState([])
  const [tab, setTab] = useState('direct')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    refreshGroups()
  }, [refreshGroups])

  useEffect(() => {
    const gid = searchParams.get('group')
    if (gid && groups.length) {
      const hit = groups.find((g) => g.id === gid)
      if (hit) setActiveGroup(hit)
    }
  }, [searchParams, groups])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return groups
    return groups.filter((g) => (g.display_name || g.name || '').toLowerCase().includes(q))
  }, [groups, search])

  const selectGroup = (g) => {
    setActiveGroup(g)
    setSearchParams({ group: g.id })
    openDock(g)
  }

  const openNewModal = async () => {
    setShowNew(true)
    try {
      const list = await messengerService.listContacts()
      setContacts(list || [])
    } catch {
      setContacts([])
    }
  }

  const startDirect = async (peerId) => {
    setBusy(true)
    try {
      const g = await createDirect(peerId)
      await refreshGroups()
      selectGroup(g)
      setShowNew(false)
    } finally {
      setBusy(false)
    }
  }

  const submitGroup = async () => {
    if (!newGroupName.trim()) return
    setBusy(true)
    try {
      const g = await createGroup({ name: newGroupName.trim(), member_ids: selectedMembers })
      await refreshGroups()
      selectGroup(g)
      setShowNew(false)
      setNewGroupName('')
      setSelectedMembers([])
    } finally {
      setBusy(false)
    }
  }

  const toggleMember = (id) => {
    setSelectedMembers((prev) => (
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    ))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="app-page-title flex items-center gap-2">
            <MessageCircle className="h-7 w-7 text-blue-600" />
            Tin nhắn
          </h1>
          <p className="app-page-subtitle">Nhắn tin trực tiếp giữa học sinh và giáo viên cùng lớp, hoặc chat nhóm lớp</p>
        </div>
        <Button onClick={openNewModal} className="gap-2">
          <Plus className="h-4 w-4" />
          Cuộc trò chuyện mới
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 min-h-[calc(100vh-220px)]">
        <div className="app-card overflow-hidden flex flex-col">
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm hội thoại…"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingGroups ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <MessengerThreadList
                groups={filtered}
                activeId={activeGroup?.id}
                unreadByGroup={unreadByGroup}
                onSelect={selectGroup}
              />
            )}
          </div>
        </div>

        <div className="min-h-[480px]">
          {activeGroup ? (
            <ChatPanel group={activeGroup} />
          ) : (
            <div className="app-card h-full flex flex-col items-center justify-center text-stone-400 py-20">
              <MessageCircle className="h-16 w-16 mb-4 opacity-30" />
              <p>Chọn hội thoại hoặc tạo cuộc trò chuyện mới</p>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showNew} onClose={() => setShowNew(false)} title="Cuộc trò chuyện mới" size="md">
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setTab('direct')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border ${tab === 'direct' ? 'bg-blue-50 border-blue-400 text-blue-900' : 'border-slate-200'}`}
          >
            <UserPlus className="h-4 w-4 inline mr-1" />
            Trực tiếp
          </button>
          <button
            type="button"
            onClick={() => setTab('group')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border ${tab === 'group' ? 'bg-blue-50 border-blue-400 text-blue-900' : 'border-slate-200'}`}
          >
            Nhóm
          </button>
        </div>

        {tab === 'direct' ? (
          <div className="max-h-64 overflow-y-auto space-y-1">
            {contacts.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-6">Chưa có liên hệ. Học sinh nhắn giáo viên lớp mình; giáo viên nhắn học sinh trong lớp dạy.</p>
            ) : contacts.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={busy}
                onClick={() => startDirect(c.id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-blue-50 text-left"
              >
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold text-sm">
                  {(c.full_name || '?').slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate">{c.full_name}</p>
                  <p className="text-xs text-stone-500 truncate">{contactSubtitle(c)}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              label="Tên nhóm"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="VD: Nhóm luyện TOEIC"
            />
            <div>
              <p className="text-sm font-medium text-stone-700 mb-2">Thêm thành viên</p>
              <div className="max-h-40 overflow-y-auto space-y-1 border rounded-xl p-2">
                {contacts.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-blue-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(c.id)}
                      onChange={() => toggleMember(c.id)}
                    />
                    <span className="text-sm">{c.full_name}</span>
                    <span className="text-xs text-stone-400 ml-auto">{roleLabel(c.role)}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={submitGroup} disabled={busy || !newGroupName.trim()} loading={busy} className="w-full">
              Tạo nhóm
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}

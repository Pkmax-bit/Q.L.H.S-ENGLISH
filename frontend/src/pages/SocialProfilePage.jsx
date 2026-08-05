import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Calendar, FileText, Info as InfoIcon, Loader2, Mail, Pencil, Phone, User as UserIcon,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useMessenger } from '../context/MessengerContext'
import { useToast } from '../context/ToastContext'
import socialService from '../services/social.service'
import api from '../services/api'
import SocialProfileHeader from '../components/social/SocialProfileHeader'
import SocialPostCard from '../components/social/SocialPostCard'
import SocialPostComposer from '../components/social/SocialPostComposer'

function EditBioModal({ open, initial, onClose, onSave, saving }) {
  const [val, setVal] = useState(initial || '')
  useEffect(() => { if (open) setVal(initial || '') }, [open, initial])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="px-4 pt-4 pb-2 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Cập nhật giới thiệu</h3>
        </div>
        <div className="p-4 space-y-2">
          <textarea
            rows={5}
            maxLength={500}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="Vài dòng giới thiệu về bạn…"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:border-blue-400 focus:outline-none"
          />
          <p className="text-[11px] text-gray-500 text-right">{val.length}/500</p>
        </div>
        <div className="px-4 pb-4 flex items-center justify-end gap-2">
          <button type="button" disabled={saving} onClick={onClose} className="px-3 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-gray-100">Huỷ</button>
          <button type="button" disabled={saving} onClick={() => onSave(val.trim())} className="px-3 py-1.5 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300">
            {saving ? 'Đang lưu…' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SocialProfilePage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const { showToast } = useToast()
  const { createDirect, openDock, refreshGroups } = useMessenger()
  const coverRef = useRef(null)
  const avatarRef = useRef(null)

  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [bioOpen, setBioOpen] = useState(false)
  const [savingBio, setSavingBio] = useState(false)

  const isOwn = String(userId) === String(user?.id)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, feed] = await Promise.all([
        socialService.getProfile(userId),
        socialService.listFeed({ author_id: userId, limit: 30 }),
      ])
      setProfile(p)
      setPosts(feed || [])
    } catch (err) {
      showToast(err.response?.data?.message || 'Không tải được hồ sơ', 'error')
    } finally {
      setLoading(false)
    }
  }, [userId, showToast])

  useEffect(() => { load() }, [load])

  const uploadImage = async (file, field) => {
    const { url } = await socialService.uploadImage(file)
    const { data: meRes } = await api.put('/auth/me', { [field]: url })
    const updated = meRes?.data
    if (updated) {
      setProfile((prev) => ({ ...prev, ...updated, [field]: url }))
      if (isOwn && updateUser) updateUser(updated)
    } else {
      setProfile((prev) => ({ ...prev, [field]: url }))
      if (isOwn && updateUser && user) updateUser({ ...user, [field]: url })
    }
    return url
  }

  const onCoverPick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    try {
      await uploadImage(file, 'cover_url')
      showToast('Đã cập nhật ảnh bìa', 'success')
    } catch {
      showToast('Không tải được ảnh bìa', 'error')
    } finally {
      setUploadingCover(false)
      e.target.value = ''
    }
  }

  const onAvatarPick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      await uploadImage(file, 'avatar_url')
      showToast('Đã cập nhật ảnh đại diện', 'success')
    } catch {
      showToast('Không tải được ảnh đại diện', 'error')
    } finally {
      setUploadingAvatar(false)
      e.target.value = ''
    }
  }

  const saveBio = async (bio) => {
    setSavingBio(true)
    try {
      const { data: meRes } = await api.put('/auth/me', { bio })
      setProfile((prev) => ({ ...prev, bio }))
      if (isOwn && updateUser) {
        if (meRes?.data) updateUser(meRes.data)
        else if (user) updateUser({ ...user, bio })
      }
      setBioOpen(false)
      showToast('Đã cập nhật giới thiệu', 'success')
    } catch {
      showToast('Không lưu được giới thiệu', 'error')
    } finally {
      setSavingBio(false)
    }
  }

  const messageUser = async () => {
    try {
      const g = await createDirect(userId)
      await refreshGroups()
      openDock(g)
      navigate(`/messenger?group=${g.id}`)
    } catch (err) {
      showToast(err.response?.data?.message || 'Không mở được chat', 'error')
    }
  }

  const canMessage = !isOwn && profile && ['teacher', 'student', 'admin'].includes(profile.role)

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-16">
        <p className="text-stone-500 mb-4">Không tìm thấy hồ sơ</p>
        <Link to="/social" className="text-blue-600 hover:underline">Về bảng tin</Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={onCoverPick} />
      <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={onAvatarPick} />

      <div className="relative">
        <SocialProfileHeader
          profile={profile}
          isOwn={isOwn}
          onBack={() => navigate('/social')}
          onEditCover={isOwn ? () => coverRef.current?.click() : undefined}
          onEditAvatar={isOwn ? () => avatarRef.current?.click() : undefined}
          loadingCover={uploadingCover}
          loadingAvatar={uploadingAvatar}
          showMessage={canMessage}
          onMessage={messageUser}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/60 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center border border-indigo-200">
              <UserIcon className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-base font-bold text-gray-900">Giới thiệu</h3>
                {isOwn && (
                  <button type="button" onClick={() => setBioOpen(true)} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold">
                    <Pencil className="h-3.5 w-3.5" /> Sửa
                  </button>
                )}
              </div>
              {profile.bio ? (
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{profile.bio}</p>
              ) : (
                <p className="text-xs text-gray-500 italic">
                  {isOwn ? 'Bạn chưa thêm giới thiệu. Nhấn "Sửa" để thêm.' : 'Chưa có giới thiệu.'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/60 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-purple-100 to-pink-50 flex items-center justify-center border border-purple-200">
              <InfoIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <h3 className="text-base font-bold text-gray-900 mb-1.5">Thông tin</h3>
              {profile.email && (
                <p className="flex items-center gap-2 text-sm text-gray-700">
                  <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">{profile.email}</span>
                </p>
              )}
              {profile.phone && (
                <p className="flex items-center gap-2 text-sm text-gray-700">
                  <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" /> {profile.phone}
                </p>
              )}
              {profile.created_at && (
                <p className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  Tham gia: {new Date(profile.created_at).toLocaleDateString('vi-VN')}
                </p>
              )}
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                Tổng bài đăng: <strong className="text-gray-900">{profile.post_count || 0}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      {profile.classes?.length > 0 && (
        <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/60 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{profile.label || 'Lớp học'}</p>
          <div className="flex flex-wrap gap-2">
            {profile.classes.map((c) => (
              <Link
                key={c.id}
                to={`/classes/${c.id}`}
                className="px-3 py-1.5 rounded-xl text-xs font-medium border bg-blue-50 border-blue-100 text-blue-800 hover:bg-blue-100 transition"
              >
                {c.name}
                {c.teacher_name && <span className="text-blue-600/70"> · {c.teacher_name}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-1 inline-flex gap-1 shadow-sm">
          <span className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium bg-blue-600 text-white shadow">
            <FileText className="h-4 w-4" />
            Bài đăng
          </span>
        </div>

        {isOwn && <SocialPostComposer onPosted={(p) => setPosts((prev) => [p, ...prev])} />}

        {posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white/75 backdrop-blur p-8 text-center text-sm text-gray-500">
            {isOwn ? 'Bạn chưa đăng bài viết nào.' : 'Chưa có bài viết công khai.'}
          </div>
        ) : (
          posts.map((post) => (
            <SocialPostCard
              key={post.id}
              post={post}
              onUpdate={(updated) => setPosts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)))}
              onDelete={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
            />
          ))
        )}
      </div>

      <EditBioModal
        open={bioOpen}
        initial={profile.bio}
        onClose={() => setBioOpen(false)}
        onSave={saveBio}
        saving={savingBio}
      />
    </div>
  )
}

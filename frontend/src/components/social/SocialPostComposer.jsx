import { useRef, useState } from 'react'
import { Globe, Image as ImageIcon, ImagePlus, Loader2, Send, Smile, Video, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import socialService from '../../services/social.service'
import SocialAvatar from './SocialAvatar'

function ComposerForm({ onPosted, onClose, autoFocus = false }) {
  const fileRef = useRef(null)
  const [body, setBody] = useState('')
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const { user } = useAuth()
  const firstName = (user?.full_name || 'Bạn').trim().split(/\s+/)[0] || 'Bạn'

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f || !f.type.startsWith('image/')) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const clearImage = () => {
    setFile(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const submit = async () => {
    const text = body.trim()
    if (!text && !file) return
    setBusy(true)
    try {
      const fd = new FormData()
      if (text) fd.append('body', text)
      if (file) fd.append('file', file)
      const post = await socialService.createPost(fd)
      setBody('')
      clearImage()
      onPosted?.(post)
      onClose?.()
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="flex items-start gap-4">
        <SocialAvatar user={user} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 text-base">{user?.full_name || user?.email || 'Thành viên'}</p>
          <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-700">
            <Globe className="w-4 h-4 text-gray-600" />
            Cộng đồng trung tâm
          </span>
        </div>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={`${firstName} ơi, bạn đang nghĩ gì thế?`}
        rows={8}
        autoFocus={autoFocus}
        className="w-full resize-y min-h-[180px] border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-200/60 text-[17px] leading-relaxed text-gray-900 placeholder:text-gray-400 px-4 py-3"
      />

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {preview && (
        <div className="relative max-w-sm">
          <img src={preview} alt="" className="rounded-xl max-h-48 object-cover border border-slate-200" />
          <button
            type="button"
            onClick={clearImage}
            className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/50 text-white text-xs"
          >
            Gỡ ảnh
          </button>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-600">Thêm vào bài viết</span>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-white text-emerald-600 text-sm font-medium transition"
        >
          <ImagePlus className="h-5 w-5" />
          Ảnh
        </button>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Huỷ
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={busy || (!body.trim() && !file)}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold shadow-sm"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Đăng
        </button>
      </div>
    </>
  )
}

export default function SocialPostComposer({ onPosted, variant = 'inline' }) {
  const { user } = useAuth()
  const fileRef = useRef(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [body, setBody] = useState('')
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)

  const firstName = (user?.full_name || 'Bạn').trim().split(/\s+/)[0] || 'Bạn'

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f || !f.type.startsWith('image/')) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    if (variant === 'collapsed') setModalOpen(true)
  }

  const clearImage = () => {
    setFile(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const submitInline = async () => {
    const text = body.trim()
    if (!text && !file) return
    setBusy(true)
    try {
      const fd = new FormData()
      if (text) fd.append('body', text)
      if (file) fd.append('file', file)
      const post = await socialService.createPost(fd)
      setBody('')
      clearImage()
      onPosted?.(post)
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  if (variant === 'collapsed') {
    return (
      <>
        <div className="flex items-center gap-3 bg-white/65 backdrop-blur-xl rounded-2xl shadow-md border border-white/60 p-3 hover:shadow-lg transition-shadow">
          <SocialAvatar user={user} linkToProfile />
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex-1 min-w-0 text-left rounded-full border border-blue-200/70 bg-white/70 hover:bg-blue-50/80 hover:border-blue-300 px-4 py-2.5 text-[15px] text-slate-500 transition-colors"
          >
            {firstName} ơi, bạn đang nghĩ gì thế?
          </button>
          <div className="flex items-center gap-0.5 shrink-0">
            <button type="button" title="Video / ảnh" onClick={() => fileRef.current?.click()} className="p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors">
              <Video className="w-6 h-6" />
            </button>
            <button type="button" title="Ảnh" onClick={() => fileRef.current?.click()} className="p-2 rounded-full hover:bg-emerald-50 text-emerald-600 transition-colors">
              <ImagePlus className="w-6 h-6" />
            </button>
            <button type="button" title="Mở soạn thảo" onClick={() => setModalOpen(true)} className="p-2 rounded-full hover:bg-amber-50 text-amber-500 transition-colors">
              <Smile className="w-6 h-6" />
            </button>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        {modalOpen && (
          <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[10vh] bg-black/45 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-2xl bg-white/95 backdrop-blur-xl shadow-xl border border-white/70 overflow-hidden ring-1 ring-slate-200/60">
              <div className="relative flex items-center justify-center px-14 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/70">
                <h2 className="text-xl font-bold text-slate-900">Tạo bài viết</h2>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full text-slate-500 hover:bg-slate-200/70 transition-colors"
                  aria-label="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-5 sm:px-7 py-5 space-y-4">
                <ComposerForm
                  onPosted={onPosted}
                  onClose={() => setModalOpen(false)}
                  autoFocus
                />
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="rounded-2xl bg-white/75 backdrop-blur-md border border-white/60 shadow-sm p-4 space-y-3">
      <div className="flex gap-3">
        <SocialAvatar user={user} />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`${firstName} ơi, bạn đang nghĩ gì thế?`}
          rows={3}
          className="flex-1 resize-none rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
      </div>

      {preview && (
        <div className="relative ml-[52px] max-w-sm">
          <img src={preview} alt="" className="rounded-xl max-h-48 object-cover border border-slate-200" />
          <button type="button" onClick={clearImage} className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/50 text-white text-xs">
            Gỡ ảnh
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 ml-[52px]">
        <div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100">
            <ImageIcon className="h-4 w-4" />
            Ảnh
          </button>
        </div>
        <button
          type="button"
          onClick={submitInline}
          disabled={busy || (!body.trim() && !file)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium shadow-sm"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Đăng
        </button>
      </div>
    </div>
  )
}

export function SocialPostComposerModal({ open, onClose, onPosted }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[10vh] bg-black/45 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-white/95 backdrop-blur-xl shadow-xl border border-white/70 overflow-hidden ring-1 ring-slate-200/60">
        <div className="relative flex items-center justify-center px-14 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/70">
          <h2 className="text-xl font-bold text-slate-900">Tạo bài viết</h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full text-slate-500 hover:bg-slate-200/70 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 sm:px-7 py-5 space-y-4">
          <ComposerForm onPosted={onPosted} onClose={onClose} autoFocus />
        </div>
      </div>
    </div>
  )
}

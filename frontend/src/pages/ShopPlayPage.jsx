import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Cloud, CloudOff, Loader2, Lock } from 'lucide-react'
import shopService from '../services/shop.service'
import { useAuth } from '../hooks/useAuth'

const MSG_GAME = 'harvest-shot'
const MSG_HOST = 'qlhs-shop'

export default function ShopPlayPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const iframeRef = useRef(null)
  const saveTimer = useRef(null)
  const studentName = (user?.full_name || user?.name || '').trim()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [error, setError] = useState('')
  const [syncState, setSyncState] = useState('idle') // idle | syncing | saved | error

  const load = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    setDenied(false)
    setError('')
    try {
      const data = await shopService.getPlayAccess(slug)
      setItem(data.item)
    } catch (err) {
      const status = err.response?.status
      if (status === 403) {
        setDenied(true)
        setItem(err.response?.data?.data?.item || null)
      } else if (status === 404) {
        setError('Không tìm thấy game')
      } else {
        setError(err.response?.data?.message || err.message || 'Không mở được game')
      }
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!item || !slug) return undefined

    const postToGame = (payload) => {
      const win = iframeRef.current?.contentWindow
      if (!win) return
      win.postMessage({ source: MSG_HOST, ...payload }, window.location.origin)
    }

    const onMessage = async (ev) => {
      if (ev.origin !== window.location.origin) return
      const d = ev.data
      if (!d || d.source !== MSG_GAME) return

      if (d.type === 'ready') {
        setSyncState('syncing')
        try {
          const [row, content] = await Promise.all([
            shopService.getSave(slug),
            shopService.getContent(slug).catch(() => null),
          ])
          postToGame({
            type: 'cloud-save',
            payload: row?.save_data || null,
            playerName: studentName || null,
          })
          if (content?.payload) {
            postToGame({
              type: 'content-pack',
              payload: content.payload,
            })
          }
          setSyncState(row?.save_data ? 'saved' : 'idle')
        } catch (err) {
          console.error('cloud load', err)
          postToGame({
            type: 'cloud-save',
            payload: null,
            playerName: studentName || null,
          })
          setSyncState('error')
        }
        return
      }

      if (d.type === 'save' && d.payload) {
        clearTimeout(saveTimer.current)
        setSyncState('syncing')
        const toStore = {
          ...d.payload,
          playerName: studentName || d.payload.playerName || '',
        }
        saveTimer.current = setTimeout(async () => {
          try {
            await shopService.putSave(slug, toStore)
            setSyncState('saved')
          } catch (err) {
            console.error('cloud save', err)
            setSyncState('error')
          }
        }, 600)
        return
      }

      if (d.type === 'clear-save') {
        clearTimeout(saveTimer.current)
        setSyncState('syncing')
        try {
          await shopService.deleteSave(slug)
          setSyncState('idle')
        } catch (err) {
          console.error('cloud clear', err)
          setSyncState('error')
        }
        return
      }

      if (d.type === 'exit') {
        navigate('/shop')
      }
    }

    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
      clearTimeout(saveTimer.current)
    }
  }, [item, slug, studentName])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] gap-2 text-stone-500">
        <Loader2 className="h-5 w-5 animate-spin" /> Đang kiểm tra quyền chơi…
      </div>
    )
  }

  if (denied) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-16">
        <Lock className="h-10 w-10 text-amber-500 mx-auto" />
        <h1 className="font-display text-xl font-semibold text-stone-900">Chưa mở khóa</h1>
        <p className="text-sm text-stone-500">
          Mua {item?.title || 'game này'} trong cửa hàng bằng điểm sao từ bài tập.
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="rounded-2xl bg-primary-600 text-white text-sm font-semibold px-4 py-2.5 hover:bg-primary-700"
          >
            Về cửa hàng
          </button>
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-16">
        <p className="text-sm text-rose-600">{error || 'Lỗi'}</p>
        <Link to="/shop" className="text-sm font-semibold text-primary-700">← Cửa hàng</Link>
      </div>
    )
  }

  const syncLabel =
    syncState === 'syncing' ? 'Đang đồng bộ…'
      : syncState === 'saved' ? 'Đã lưu cloud'
        : syncState === 'error' ? 'Lỗi đồng bộ'
          : 'Cloud sẵn sàng'

  return (
    <div className="fixed inset-0 z-[80] bg-black flex flex-col">
      <div className="shrink-0 flex items-center gap-3 px-3 py-2 bg-stone-950/95 border-b border-white/10 text-white">
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Thoát
        </button>
        <span className="text-sm font-semibold truncate flex-1">{item.title}</span>
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
            syncState === 'error' ? 'text-rose-300' : 'text-white/60'
          }`}
          title="Tiến độ game lưu trên Supabase"
        >
          {syncState === 'error' ? <CloudOff className="h-3.5 w-3.5" /> : <Cloud className="h-3.5 w-3.5" />}
          {syncState === 'syncing' ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {syncLabel}
        </span>
      </div>
      <iframe
        ref={iframeRef}
        title={item.title}
        src={item.play_path}
        className="flex-1 w-full border-0 bg-black"
        allow="fullscreen; gamepad; autoplay"
        allowFullScreen
      />
    </div>
  )
}

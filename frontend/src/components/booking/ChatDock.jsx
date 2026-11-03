import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, MessageCircle, Send, X } from 'lucide-react'
import clsx from 'clsx'
import { colorClasses } from '../../lib/bookingUtils'
import { useIsNarrow } from '../../hooks/useIsNarrow'

// Socket đẩy tin ngay; vòng hỏi lại chỉ còn là lưới an toàn cho lúc rớt mạng
// hoặc socket không nối được (proxy chặn websocket chẳng hạn).
const POLL_MS = 60000

function timeOf(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
}

/**
 * Nút chat nổi góc phải dưới + hộp thoại với trung tâm.
 *
 * Học viên: một luồng duy nhất với trung tâm, mở ra là gõ luôn.
 * Người quản lý: danh sách luồng của mọi học viên, bấm vào một người mới vào
 * khung chat — nếu không thì tin của bảy người lẫn vào nhau.
 *
 * Tin đến theo THỜI GIAN THỰC qua socket: server đẩy sự kiện `booking:message`
 * vào phòng của luồng đó. Trang công khai nối bằng chính booking token — phòng
 * lấy theo id trong token nên không ai nghe được luồng của người khác.
 *
 * Vẫn giữ một vòng hỏi lại 60 giây làm lưới an toàn: websocket rớt hoặc bị
 * proxy chặn thì chat chậm một phút, còn hơn là im hẳn mà người dùng không biết.
 */
export default function ChatDock({ isManager = false, api, socket }) {
  const narrow = useIsNarrow()
  const [open, setOpen] = useState(false)
  const [threads, setThreads] = useState([])
  const [activeThread, setActiveThread] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef(null)

  const loadThreads = useCallback(() => {
    if (!isManager) return Promise.resolve()
    return api
      .listThreads()
      .then(setThreads)
      .catch(() => setThreads([]))
  }, [api, isManager])

  const loadMessages = useCallback(() => {
    if (isManager && !activeThread) return Promise.resolve()
    return api
      .listMessages(isManager ? activeThread : null)
      .then((res) => setMessages(res.messages || []))
      .catch((err) => setError(err.response?.data?.message || 'Không tải được tin nhắn'))
  }, [api, isManager, activeThread])

  useEffect(() => {
    if (!open) return undefined
    loadThreads()
    loadMessages()
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      loadThreads()
      loadMessages()
    }, POLL_MS)
    return () => clearInterval(id)
  }, [open, loadThreads, loadMessages])

  // Nghe trên socket chung của trang, kể cả khi hộp chat đang đóng: có vậy
  // chấm đỏ mới nhảy ngay lúc học viên nhắn, chứ không phải mở hộp ra mới biết
  useEffect(() => {
    const sock = socket?.current
    if (!sock) return undefined
    const onMessage = () => {
      loadThreads()
      loadMessages()
    }
    sock.on('booking:message', onMessage)
    return () => sock.off('booking:message', onMessage)
  }, [socket, loadThreads, loadMessages])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, open])

  const send = async (e) => {
    e?.preventDefault()
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setError('')
    try {
      await api.send(text, isManager ? activeThread : null)
      setDraft('')
      await loadMessages()
      await loadThreads()
    } catch (err) {
      setError(err.response?.data?.message || 'Không gửi được')
    } finally {
      setSending(false)
    }
  }

  const unreadTotal = threads.reduce((n, t) => n + (t.unread || 0), 0)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Nhắn tin với trung tâm"
        className="fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg shadow-primary-900/20 transition-transform hover:scale-105 active:scale-95 sm:bottom-6"
      >
        <MessageCircle className="h-5 w-5" />
        {isManager && unreadTotal > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold">
            {unreadTotal}
          </span>
        )}
      </button>
    )
  }

  return (
    <div
      className={clsx(
        'fixed z-[60] flex flex-col overflow-hidden bg-white shadow-xl shadow-slate-900/15',
        narrow
          ? 'inset-x-0 bottom-0 h-[70vh] rounded-t-2xl'
          : 'bottom-6 right-4 h-[460px] w-[340px] rounded-2xl border border-slate-200'
      )}
    >
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2.5">
        {isManager && activeThread && (
          <button
            type="button"
            onClick={() => setActiveThread(null)}
            className="rounded p-0.5 text-slate-500 hover:bg-slate-200"
            title="Về danh sách"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-900">
          {isManager
            ? activeThread
              ? threads.find((t) => t.registrant_id === activeThread)?.full_name || 'Học viên'
              : 'Tin nhắn học viên'
            : 'Nhắn với trung tâm'}
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          title="Đóng"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {isManager && !activeThread ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-400">Chưa ai nhắn tin.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {threads.map((t) => (
                <li key={t.registrant_id}>
                  <button
                    type="button"
                    onClick={() => setActiveThread(t.registrant_id)}
                    className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-primary-50/60"
                  >
                    <span
                      className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', colorClasses(t.color).dot)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-stone-900">
                          {t.full_name || t.phone}
                        </span>
                        {t.unread > 0 && (
                          <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                            {t.unread}
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-slate-500">{t.last_body}</span>
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-400">{timeOf(t.last_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {messages.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">
                {isManager ? 'Chưa có tin nào.' : 'Nhắn cho trung tâm nếu cần đổi giờ hay hỏi lớp.'}
              </p>
            )}
            {messages.map((m) => {
              // "của mình" đổi theo vai: quản lý thì tin trung tâm nằm bên phải
              const mine = isManager ? m.sender === 'center' : m.sender === 'student'
              return (
                <div key={m.id} className={clsx('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div
                    className={clsx(
                      'max-w-[80%] rounded-2xl px-3 py-1.5 text-sm',
                      mine
                        ? 'rounded-br-sm bg-primary-600 text-white'
                        : 'rounded-bl-sm bg-slate-100 text-stone-800'
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p
                      className={clsx(
                        'mt-0.5 text-[10px]',
                        mine ? 'text-white/70' : 'text-slate-400'
                      )}
                    >
                      {timeOf(m.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={endRef} />
          </div>

          {error && <p className="px-3 pb-1 text-xs text-red-600">{error}</p>}

          <form onSubmit={send} className="flex items-end gap-2 border-t border-slate-100 p-2">
            <textarea
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // Enter gửi, Shift+Enter xuống dòng — thói quen của mọi hộp chat
                if (e.key === 'Enter' && !e.shiftKey) send(e)
              }}
              placeholder="Nhập tin nhắn..."
              className="max-h-24 min-h-[36px] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white disabled:opacity-40"
              title="Gửi"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </>
      )}
    </div>
  )
}

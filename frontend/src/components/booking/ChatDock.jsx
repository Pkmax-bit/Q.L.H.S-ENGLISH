import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Ban, BarChart3, Check, CheckCheck, CornerUpLeft, ImagePlus, Lock, MessageCircle, Plus, Send, SmilePlus, Trash2, X } from 'lucide-react'
import clsx from 'clsx'
import { colorClasses } from '../../lib/bookingUtils'
import { useIsNarrow } from '../../hooks/useIsNarrow'

// Socket đẩy tin ngay; vòng hỏi lại chỉ còn là lưới an toàn cho lúc rớt mạng
// hoặc socket không nối được (proxy chặn websocket chẳng hạn).
const POLL_MS = 60000

// Sáu cảm xúc hay dùng. Không mở bảng emoji đầy đủ: thả cảm xúc là thao tác
// một chạm, bày cả trăm icon ra thì thành đi tìm.
// ❤ phải kèm U+FE0F mới ra trái tim ĐỎ; thiếu nó hệ điều hành vẽ
// thành trái tim đen kiểu ký tự chữ
const EMOJIS = ['👍', '❤️', '😄', '😮', '😢', '🙏']

/**
 * Cắt nội dung thành các đoạn thường và đoạn @nhắc tên.
 *
 * Dò theo DANH SÁCH TÊN THẬT chứ không bắt từ @ tới khoảng trắng: tên người
 * Việt có dấu cách ("@Mai Huỳnh Anh Thi"), bắt tới khoảng trắng thì chỉ tô
 * được chữ "Mai".
 */
function highlightMentions(text, names) {
  if (!text) return []
  const found = [...(names || [])]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length) // tên dài khớp trước, tránh cắt nửa chừng
  const parts = []
  let i = 0
  while (i < text.length) {
    if (text[i] === '@') {
      const hit = found.find((n) => text.startsWith(`@${n}`, i))
      if (hit) {
        parts.push({ mention: true, text: `@${hit}` })
        i += hit.length + 1
        continue
      }
    }
    const last = parts[parts.length - 1]
    if (last && !last.mention) last.text += text[i]
    else parts.push({ mention: false, text: text[i] })
    i += 1
  }
  return parts
}

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
export default function ChatDock({ isManager = false, api, socket, unread = 0, mentionNames = [] }) {
  const narrow = useIsNarrow()
  const [open, setOpen] = useState(false)
  const [threads, setThreads] = useState([])
  const [activeThread, setActiveThread] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  // Tin đang trả lời, và tin đang mở bảng cảm xúc
  const [replyTo, setReplyTo] = useState(null)
  const [pickerFor, setPickerFor] = useState(null)
  // Ảnh đang chờ gửi + link xem trước tạm trong trình duyệt
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState('')
  const fileRef = useRef(null)
  // Gợi ý @: bật khi người dùng vừa gõ @ và chưa gõ hết tên
  const [mentionQuery, setMentionQuery] = useState(null)
  const inputRef = useRef(null)
  // Soạn bình chọn: null = đang đóng, object = đang mở
  const [pollDraft, setPollDraft] = useState(null)
  // Bình chọn đang chờ xác nhận xóa. Hai nhịp bấm thay cho hộp thoại: xóa là
  // mất cả phiếu của người khác, mà dựng modal cho một thao tác nhỏ thì nặng tay.
  const [askDelete, setAskDelete] = useState(null)
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
    if (!socket) return undefined
    const onMessage = () => {
      loadThreads()
      loadMessages()
    }
    socket.on('booking:message', onMessage)
    return () => socket.off('booking:message', onMessage)
  }, [socket, loadThreads, loadMessages])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, open])

  // Link xem trước là bộ nhớ của trình duyệt, không thu hồi thì rò rỉ dần
  useEffect(() => {
    if (!image) {
      setPreview('')
      return undefined
    }
    const url = URL.createObjectURL(image)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [image])

  const send = async (e) => {
    e?.preventDefault()
    const text = draft.trim()
    // Gửi được khi có chữ HOẶC có ảnh
    if ((!text && !image) || sending) return
    setSending(true)
    setError('')
    try {
      await api.send(text, isManager ? activeThread : null, replyTo?.id || null, image)
      setDraft('')
      setReplyTo(null)
      setImage(null)
      if (fileRef.current) fileRef.current.value = ''
      await loadMessages()
      await loadThreads()
    } catch (err) {
      setError(err.response?.data?.message || 'Không gửi được')
    } finally {
      setSending(false)
    }
  }

  /**
   * Thả cảm xúc: đổi ngay trên màn rồi mới gọi API.
   *
   * Chờ API xong mới vẽ thì bấm xong phải đợi hơn một giây mới thấy gì —
   * với thao tác một chạm thì cảm giác như bấm hụt. Hỏng thì trả lại trạng
   * thái cũ và báo lỗi.
   */
  const react = async (messageId, emoji) => {
    setPickerFor(null)
    const truoc = messages
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m
        const list = m.reactions || []
        const found = list.find((r) => r.emoji === emoji)
        if (!found) return { ...m, reactions: [...list, { emoji, count: 1, mine: true }] }
        const next = found.mine
          ? { ...found, count: found.count - 1, mine: false }
          : { ...found, count: found.count + 1, mine: true }
        return {
          ...m,
          reactions: list.flatMap((r) => (r.emoji !== emoji ? [r] : next.count > 0 ? [next] : [])),
        }
      })
    )
    try {
      await api.react(messageId, emoji)
    } catch (err) {
      setMessages(truoc)
      setError(err.response?.data?.message || 'Không thả được cảm xúc')
    }
  }

  // Người quản lý đếm theo danh sách luồng (đã mở hộp thì có sẵn), học viên
  // lấy từ con số server trả kèm bảng — họ không được đọc danh sách luồng
  // Tin cuối CỦA MÌNH đã được phía kia mở ra đọc, và tin cuối mình vừa gửi.
  // Duyệt từ cuối lên nên gặp cái nào trước là cái đó.
  const mineOf = (m) => (isManager ? m.sender === 'center' : m.sender === 'student')
  let lastSeenId = null
  let lastSentId = null
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i]
    if (!mineOf(m)) continue
    if (!lastSentId) lastSentId = m.id
    if (m.read_at) {
      lastSeenId = m.id
      break
    }
  }
  const tenPhiaKia = isManager
    ? threads.find((t) => t.registrant_id === activeThread)?.full_name || 'Học viên'
    : 'Trung tâm'

  /**
   * Bỏ phiếu: đổi ngay trên màn rồi mới gọi API, như cảm xúc. Một chạm mà
   * phải chờ một giây mới thấy gì thì người dùng bấm lại lần nữa.
   */
  const vote = async (messageId, optionId) => {
    const truoc = messages
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || !m.poll) return m
        const dangChon = m.poll.options.find((o) => o.id === optionId)?.mine
        return {
          ...m,
          poll: {
            ...m.poll,
            options: m.poll.options.map((o) => {
              if (o.id === optionId) {
                return dangChon
                  ? { ...o, mine: false, count: o.count - 1, names: o.names.filter((n) => n !== 'Bạn') }
                  : { ...o, mine: true, count: o.count + 1, names: [...o.names, 'Bạn'] }
              }
              // Bình chọn một lựa chọn: chọn cái mới là bỏ cái cũ
              if (!m.poll.multi && o.mine && !dangChon) {
                return { ...o, mine: false, count: o.count - 1, names: o.names.filter((n) => n !== 'Bạn') }
              }
              return o
            }),
          },
        }
      })
    )
    try {
      await api.vote(messageId, optionId)
    } catch (err) {
      setMessages(truoc)
      setError(err.response?.data?.message || 'Không bình chọn được')
    }
  }

  const closePoll = async (messageId) => {
    try {
      await api.closePoll(messageId)
      await loadMessages()
    } catch (err) {
      setError(err.response?.data?.message || 'Không khóa được bình chọn')
    }
  }

  /**
   * Thu hồi tin. Server xóa nội dung nhưng GIỮ dòng lại, nên ở đây cũng chỉ
   * đổi tin thành "đã thu hồi" chứ không gỡ khỏi danh sách — gỡ hẳn thì ô
   * trích dẫn ở tin trả lời nó cũng mất theo, người đọc còn lại một câu trả
   * lời không biết trả lời cái gì.
   */
  const removeMessage = async (messageId) => {
    setAskDelete(null)
    const truoc = messages
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, body: null, image_url: null, poll: null, reactions: [], deleted_at: new Date().toISOString() }
          : m
      )
    )
    try {
      await api.deleteMessage(messageId)
    } catch (err) {
      setMessages(truoc)
      setError(err.response?.data?.message || 'Không thu hồi được tin')
    }
  }

  const removePoll = async (messageId) => {
    setAskDelete(null)
    try {
      await api.deletePoll(messageId)
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    } catch (err) {
      setError(err.response?.data?.message || 'Không xóa được bình chọn')
      await loadMessages()
    }
  }

  const sendPoll = async () => {
    const options = pollDraft.options.map((o) => o.trim()).filter(Boolean)
    if (!pollDraft.question.trim() || options.length < 2) {
      setError('Cần câu hỏi và ít nhất 2 phương án')
      return
    }
    setSending(true)
    try {
      await api.createPoll({
        question: pollDraft.question,
        options,
        multi: pollDraft.multi,
        target_id: isManager ? activeThread : null,
      })
      setPollDraft(null)
      setError('')
      await loadMessages()
    } catch (err) {
      setError(err.response?.data?.message || 'Không gửi được bình chọn')
    } finally {
      setSending(false)
    }
  }

  const unreadTotal = isManager
    ? Math.max(threads.reduce((n, t) => n + (t.unread || 0), 0), open ? 0 : unread)
    : unread

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Nhắn tin với trung tâm"
        className="fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg shadow-primary-900/20 transition-transform hover:scale-105 active:scale-95 sm:bottom-6"
      >
        <MessageCircle className="h-5 w-5" />
        {unreadTotal > 0 && (
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
                <div key={m.id} className={clsx('group flex', mine ? 'justify-end' : 'justify-start')}>
                  <div className={clsx('flex max-w-[85%] items-end gap-1', mine && 'flex-row-reverse')}>
                    <div className="min-w-0">
                      <div
                        className={clsx(
                          'rounded-2xl px-3 py-1.5 text-sm',
                          mine
                            ? 'rounded-br-sm bg-primary-600 text-white'
                            : 'rounded-bl-sm bg-slate-100 text-stone-800'
                        )}
                      >
                        {m.reply && (
                          <div
                            className={clsx(
                              'mb-1 border-l-2 pl-2 text-xs',
                              mine ? 'border-white/50 text-white/80' : 'border-slate-400 text-slate-500'
                            )}
                          >
                            <span className="font-semibold">
                              {m.reply.sender === 'center' ? 'Trung tâm' : 'Học viên'}
                            </span>
                            <span className="block truncate">{m.reply.body || 'Tin đã bị xóa'}</span>
                          </div>
                        )}
                        {m.deleted_at && (
                          <p
                            className={clsx(
                              'flex items-center gap-1.5 italic',
                              mine ? 'text-white/70' : 'text-slate-400'
                            )}
                          >
                            <Ban className="h-3.5 w-3.5 shrink-0" />
                            Tin nhắn đã được thu hồi
                          </p>
                        )}
                        {m.image_url && (
                          <a href={m.image_url} target="_blank" rel="noreferrer" className="block">
                            <img
                              src={m.image_url}
                              alt="Ảnh đã gửi"
                              loading="lazy"
                              className="mb-1 max-h-52 w-auto max-w-full rounded-lg object-cover"
                            />
                          </a>
                        )}
                        {m.body && !m.poll && (
                          <p className="whitespace-pre-wrap break-words">
                            {/* Tách @Tên ra để tô đậm; tên có dấu cách nên bắt theo
                                danh sách thật, không bắt bừa tới khoảng trắng */}
                            {highlightMentions(m.body, mentionNames).map((part, i) =>
                              part.mention ? (
                                <b
                                  key={i}
                                  className={clsx(
                                    'rounded px-0.5 font-semibold',
                                    mine ? 'bg-white/20' : 'bg-primary-100 text-primary-800'
                                  )}
                                >
                                  {part.text}
                                </b>
                              ) : (
                                <span key={i}>{part.text}</span>
                              )
                            )}
                          </p>
                        )}
                        {/* Thẻ bình chọn luôn NỀN TRẮNG CHỮ ĐẬM, kể cả khi
                            nằm trong bong bóng xanh của mình: chữ trắng trên
                            nền trong mờ thì thanh phiếu và chữ gần như cùng
                            một sắc, nhìn không ra ai hơn ai. */}
                        {m.poll && (
                          <div className="mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 text-stone-800 shadow-sm">
                            <div className="mb-2 flex items-start gap-2">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                                <BarChart3 className="h-3.5 w-3.5" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="break-words text-sm font-semibold leading-snug">
                                  {m.poll.question}
                                </p>
                                <p className="mt-0.5 text-[11px] text-slate-400">
                                  {m.poll.voter_count} người đã chọn
                                  {m.poll.multi ? ' · chọn nhiều ý' : ''}
                                </p>
                              </div>
                              {m.poll.closed_at && (
                                <span className="flex shrink-0 items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                                  <Lock className="h-2.5 w-2.5" />
                                  Đã khóa
                                </span>
                              )}
                            </div>

                            <div className="space-y-1">
                              {m.poll.options.map((o) => {
                                // Phần trăm tính trên SỐ NGƯỜI bầu, không trên
                                // tổng phiếu: bình chọn nhiều ý thì tổng phiếu
                                // vượt quá số người, cộng lại ra hơn 100%
                                const pct = m.poll.voter_count
                                  ? Math.round((o.count / m.poll.voter_count) * 100)
                                  : 0
                                return (
                                  <button
                                    key={o.id}
                                    type="button"
                                    disabled={Boolean(m.poll.closed_at)}
                                    onClick={() => vote(m.id, o.id)}
                                    title={o.names?.length ? o.names.join(', ') : 'Chưa ai chọn'}
                                    className={clsx(
                                      'relative flex w-full items-center gap-2 overflow-hidden rounded-lg border px-2 py-1.5 text-left text-xs transition-colors',
                                      o.mine
                                        ? 'border-primary-300 text-primary-900'
                                        : 'border-slate-200 text-stone-700',
                                      !m.poll.closed_at && 'hover:border-primary-300'
                                    )}
                                  >
                                    {/* Thanh nền chạy theo tỷ lệ, nằm dưới chữ */}
                                    <span
                                      aria-hidden="true"
                                      style={{ width: `${pct}%` }}
                                      className={clsx(
                                        'absolute inset-y-0 left-0 transition-all duration-300',
                                        o.mine ? 'bg-primary-100' : 'bg-slate-100'
                                      )}
                                    />
                                    <span
                                      className={clsx(
                                        'relative flex h-4 w-4 shrink-0 items-center justify-center border',
                                        m.poll.multi ? 'rounded' : 'rounded-full',
                                        o.mine
                                          ? 'border-primary-500 bg-primary-500 text-white'
                                          : 'border-slate-300 bg-white'
                                      )}
                                    >
                                      {o.mine && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                                    </span>
                                    <span
                                      className={clsx(
                                        'relative min-w-0 flex-1 truncate',
                                        o.mine && 'font-semibold'
                                      )}
                                    >
                                      {o.text}
                                    </span>
                                    <span className="relative shrink-0 tabular-nums text-[11px] text-slate-400">
                                      {pct}%
                                    </span>
                                    <span className="relative w-5 shrink-0 text-right font-semibold tabular-nums">
                                      {o.count}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>

                            {/* Người tạo (và trung tâm) mới thấy hai nút này */}
                            {(mine || isManager) && (
                              <div className="mt-2 flex items-center gap-3 border-t border-slate-100 pt-1.5 text-[11px]">
                                {!m.poll.closed_at && (
                                  <button
                                    type="button"
                                    onClick={() => closePoll(m.id)}
                                    className="flex items-center gap-1 text-slate-500 hover:text-primary-600"
                                  >
                                    <Lock className="h-3 w-3" />
                                    Khóa
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    askDelete === m.id ? removePoll(m.id) : setAskDelete(m.id)
                                  }
                                  onBlur={() => setAskDelete((cur) => (cur === m.id ? null : cur))}
                                  className={clsx(
                                    'ml-auto flex items-center gap-1',
                                    askDelete === m.id
                                      ? 'font-semibold text-red-600'
                                      : 'text-slate-500 hover:text-red-600'
                                  )}
                                >
                                  <Trash2 className="h-3 w-3" />
                                  {askDelete === m.id ? 'Bấm lần nữa để xóa' : 'Xóa'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        <p className={clsx('mt-0.5 text-[10px]', mine ? 'text-white/70' : 'text-slate-400')}>
                          {timeOf(m.created_at)}
                        </p>
                      </div>

                      {/* Chỉ gắn vào TIN CUỐI CÙNG đã được xem: dán "đã xem"
                          lên từng tin thì cột chữ xám chạy dọc cả luồng, mà
                          thông tin thì vẫn chỉ có một — người kia đọc tới đâu. */}
                      {mine && m.id === lastSeenId && (
                        <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-slate-400">
                          <CheckCheck className="h-3 w-3 text-primary-500" />
                          {tenPhiaKia} đã xem · {timeOf(m.read_at)}
                        </p>
                      )}
                      {mine && m.id === lastSentId && !lastSeenId && (
                        <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-slate-400">
                          <Check className="h-3 w-3" />
                          Đã gửi
                        </p>
                      )}

                      {m.reactions?.length > 0 && (
                        <div className={clsx('mt-0.5 flex flex-wrap gap-1', mine && 'justify-end')}>
                          {m.reactions.filter((r) => r.count > 0).map((r) => (
                            <button
                              key={r.emoji}
                              type="button"
                              onClick={() => react(m.id, r.emoji)}
                              // Ai thả hiện ngay trên tooltip của chip — một
                              // luồng chỉ có hai phía nên chuỗi tên không bao
                              // giờ dài, không cần mở hộp riêng để xem
                              title={`${(r.names || []).join(', ')}${
                                r.names?.length ? ' — ' : ''
                              }${r.mine ? 'bấm để bỏ' : 'bấm để thả'}`}
                              className={clsx(
                                'flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px]',
                                r.mine
                                  ? 'border-primary-400 bg-primary-50 text-primary-700'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-primary-300'
                              )}
                            >
                              <span>{r.emoji}</span>
                              {r.count > 1 && <span className="font-semibold">{r.count}</span>}
                            </button>
                          ))}
                        </div>
                      )}

                      {pickerFor === m.id && (
                        <div
                          className={clsx(
                            'mt-1 flex gap-0.5 rounded-full border border-slate-200 bg-white px-1.5 py-1 shadow-md',
                            mine && 'justify-end'
                          )}
                        >
                          {EMOJIS.map((e) => (
                            <button
                              key={e}
                              type="button"
                              onClick={() => react(m.id, e)}
                              className="rounded-full px-1 text-base leading-none transition-transform hover:scale-125"
                              title={`Thả ${e}`}
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Mấy nút nhỏ cạnh bong bóng. Để mờ sẵn chứ không ẩn hẳn:
                        màn cảm ứng không có trạng thái rê chuột, ẩn đi là không
                        ai biết có trả lời và cảm xúc.
                        Tin đã thu hồi thì không còn gì để thả, để trả lời hay
                        để thu hồi tiếp — bỏ cả cụm cho khỏi bấm nhầm. */}
                    {!m.deleted_at && (
                      <div className="flex shrink-0 flex-col gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          title="Thả cảm xúc"
                          onClick={() => setPickerFor((cur) => (cur === m.id ? null : m.id))}
                          className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-primary-600"
                        >
                          <SmilePlus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Trả lời tin này"
                          onClick={() => setReplyTo(m)}
                          className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-primary-600"
                        >
                          <CornerUpLeft className="h-3.5 w-3.5" />
                        </button>
                        {/* Thu hồi: hai nhịp bấm, nhịp hai nút đỏ lên. Tin đã
                            gửi đi rồi nên không có đường lùi, mà dựng hộp thoại
                            giữa luồng chat thì cắt ngang mạch đọc. */}
                        {(mine || isManager) && (
                          <button
                            type="button"
                            title={askDelete === m.id ? 'Bấm lần nữa để thu hồi' : 'Thu hồi tin này'}
                            onClick={() =>
                              askDelete === m.id ? removeMessage(m.id) : setAskDelete(m.id)
                            }
                            onBlur={() => setAskDelete((cur) => (cur === m.id ? null : cur))}
                            className={clsx(
                              'rounded p-0.5 hover:bg-slate-100',
                              askDelete === m.id
                                ? 'bg-red-50 text-red-600'
                                : 'text-slate-400 hover:text-red-600'
                            )}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={endRef} />
          </div>

          {error && <p className="px-3 pb-1 text-xs text-red-600">{error}</p>}

          {replyTo && (
            <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-xs">
              <CornerUpLeft className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1 truncate text-slate-600">
                Trả lời: <b>{replyTo.body}</b>
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="shrink-0 rounded p-0.5 text-slate-400 hover:text-red-500"
                title="Bỏ trả lời"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {mentionQuery !== null && mentionNames.length > 0 && (
            <div className="max-h-32 overflow-y-auto border-t border-slate-100 bg-white">
              {mentionNames
                .filter((n) => n.toLowerCase().includes(mentionQuery.toLowerCase()))
                .slice(0, 6)
                .map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      // Thay đúng đoạn @đang gõ, giữ nguyên phần còn lại của câu
                      setDraft((d) => d.replace(/(?:^|\s)@([^@]{0,20})$/, (full) => `${full.startsWith('@') ? '' : ' '}@${n} `))
                      setMentionQuery(null)
                      inputRef.current?.focus()
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-primary-50"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700">
                      {/* Chữ cái tên gọi: người Việt gọi nhau bằng chữ cuối */}
                      {n.trim().split(/\s+/).pop().charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate">{n}</span>
                  </button>
                ))}
            </div>
          )}

          {pollDraft && (
            <div className="space-y-1.5 border-t border-slate-100 bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5 shrink-0 text-primary-600" />
                <span className="flex-1 text-xs font-semibold text-slate-700">Tạo bình chọn</span>
                <button
                  type="button"
                  onClick={() => setPollDraft(null)}
                  className="rounded p-0.5 text-slate-400 hover:text-red-500"
                  title="Bỏ bình chọn"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <input
                value={pollDraft.question}
                onChange={(e) => setPollDraft((d) => ({ ...d, question: e.target.value }))}
                placeholder="Câu hỏi, ví dụ: Buổi bù vào giờ nào tiện?"
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-primary-400 focus:outline-none"
              />
              {pollDraft.options.map((o, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    value={o}
                    onChange={(e) =>
                      setPollDraft((d) => ({
                        ...d,
                        options: d.options.map((x, j) => (j === i ? e.target.value : x)),
                      }))
                    }
                    placeholder={`Phương án ${i + 1}`}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-primary-400 focus:outline-none"
                  />
                  {/* Giữ lại tối thiểu hai ô: bớt xuống một thì không còn là
                      bình chọn, mà server cũng từ chối */}
                  {pollDraft.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPollDraft((d) => ({ ...d, options: d.options.filter((_, j) => j !== i) }))
                      }
                      className="shrink-0 rounded p-1 text-slate-400 hover:text-red-500"
                      title="Bỏ phương án"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-2">
                {pollDraft.options.length < 10 && (
                  <button
                    type="button"
                    onClick={() => setPollDraft((d) => ({ ...d, options: [...d.options, ''] }))}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:border-primary-300"
                  >
                    <Plus className="h-3 w-3" />
                    Thêm phương án
                  </button>
                )}
                <label className="flex items-center gap-1.5 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={pollDraft.multi}
                    onChange={(e) => setPollDraft((d) => ({ ...d, multi: e.target.checked }))}
                  />
                  Cho chọn nhiều ý
                </label>
                <button
                  type="button"
                  disabled={sending}
                  onClick={sendPoll}
                  className="ml-auto flex items-center gap-1 rounded-lg bg-primary-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-40"
                >
                  <Send className="h-3 w-3" />
                  Gửi bình chọn
                </button>
              </div>
            </div>
          )}

          {preview && (
            <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-3 py-2">
              <img src={preview} alt="Ảnh sắp gửi" className="h-12 w-12 rounded-lg object-cover" />
              <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{image?.name}</span>
              <button
                type="button"
                onClick={() => {
                  setImage(null)
                  if (fileRef.current) fileRef.current.value = ''
                }}
                className="shrink-0 rounded p-0.5 text-slate-400 hover:text-red-500"
                title="Bỏ ảnh"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={send} className="flex items-end gap-2 border-t border-slate-100 p-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                if (f.size > 5 * 1024 * 1024) {
                  setError('Ảnh tối đa 5MB')
                  e.target.value = ''
                  return
                }
                setError('')
                setImage(f)
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              title="Gửi ảnh"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-primary-600"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                setPollDraft((d) => (d ? null : { question: '', options: ['', ''], multi: false }))
              }
              title="Tạo bình chọn"
              className={clsx(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl hover:bg-slate-100',
                pollDraft ? 'text-primary-600' : 'text-slate-400 hover:text-primary-600'
              )}
            >
              <BarChart3 className="h-4 w-4" />
            </button>
            <textarea
              rows={1}
              ref={inputRef}
              value={draft}
              onChange={(e) => {
                const v = e.target.value
                setDraft(v)
                // Chỉ mở gợi ý khi @ đứng đầu dòng hoặc sau khoảng trắng
                const m = v.slice(0, e.target.selectionStart).match(/(?:^|\s)@([^@]{0,20})$/)
                setMentionQuery(m ? m[1] : null)
              }}
              onKeyDown={(e) => {
                // Enter gửi, Shift+Enter xuống dòng — thói quen của mọi hộp chat
                if (e.key === 'Enter' && !e.shiftKey) send(e)
              }}
              placeholder="Nhập tin nhắn..."
              className="max-h-24 min-h-[36px] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || (!draft.trim() && !image)}
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

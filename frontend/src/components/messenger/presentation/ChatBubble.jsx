import clsx from 'clsx'

function avatarGradient(name) {
  const s = String(name || '?')
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0
  const colors = [
    'from-amber-400 to-yellow-500',
    'from-sky-400 to-blue-500',
    'from-emerald-400 to-green-500',
    'from-violet-400 to-purple-500',
    'from-rose-400 to-pink-500',
  ]
  return colors[h % colors.length]
}

export default function ChatBubble({ message, viewerId, showSender }) {
  const isMe = String(message.user_id) === String(viewerId)
  const isSystem = message.is_system

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[11px] text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 max-w-[95%] text-center leading-snug">
          {message.content}
        </span>
      </div>
    )
  }

  const senderName = message.user?.full_name || 'Thành viên'
  const time = message.created_at
    ? new Date(message.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : ''

  const apiBase = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:3001'

  return (
    <div className={clsx('flex gap-2 mb-3', isMe ? 'justify-end' : 'justify-start')}>
      {!isMe && (
        <div className={clsx(
          'w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm',
          avatarGradient(senderName),
        )}>
          {senderName.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className={clsx('max-w-[75%] min-w-0', isMe && 'flex flex-col items-end')}>
        {showSender && !isMe && (
          <p className="text-[10px] text-stone-500 mb-0.5 px-1">{senderName}</p>
        )}
        <div className={clsx(
          'rounded-3xl px-4 py-2.5 shadow-sm',
          isMe
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md'
            : 'bg-white text-gray-800 rounded-bl-md border border-slate-200/80',
        )}>
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          )}
          {message.attachment_url && (
            <div className="mt-1">
              {message.attachment_mime?.startsWith('image/') ? (
                <a href={`${apiBase}${message.attachment_url}`} target="_blank" rel="noreferrer">
                  <img
                    src={`${apiBase}${message.attachment_url}`}
                    alt={message.attachment_name || 'ảnh'}
                    className="max-w-full rounded-lg max-h-48 object-cover"
                  />
                </a>
              ) : (
                <a
                  href={`${apiBase}${message.attachment_url}`}
                  target="_blank"
                  rel="noreferrer"
                  className={clsx('text-sm underline', isMe ? 'text-blue-100' : 'text-blue-700')}
                >
                  📎 {message.attachment_name || 'Tệp đính kèm'}
                </a>
              )}
            </div>
          )}
        </div>
        <span className="text-[10px] text-stone-400 mt-0.5 px-1">{time}</span>
      </div>
    </div>
  )
}

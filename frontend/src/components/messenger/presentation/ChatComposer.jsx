import { useRef, useState } from 'react'
import { Send, Paperclip, Loader2 } from 'lucide-react'

export default function ChatComposer({ onSend, onTyping, disabled, placeholder = 'Nhập tin nhắn…' }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const fileRef = useRef(null)
  const typingRef = useRef(null)

  const handleTyping = (value) => {
    onTyping?.(!!value.trim())
    clearTimeout(typingRef.current)
    typingRef.current = setTimeout(() => onTyping?.(false), 2000)
  }

  const submit = async () => {
    const content = text.trim()
    if (!content || sending) return
    setSending(true)
    try {
      await onSend(content)
      setText('')
      onTyping?.(false)
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file || sending) return
    setSending(true)
    try {
      await onSend('', file)
    } finally {
      setSending(false)
      e.target.value = ''
    }
  }

  return (
    <div className="border-t border-amber-200/50 bg-white/70 backdrop-blur-md p-3">
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || sending}
          className="p-2 rounded-xl text-stone-500 hover:bg-amber-50 hover:text-amber-700 transition-colors disabled:opacity-40"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={onFile} />
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            handleTyping(e.target.value)
          }}
          onKeyDown={onKeyDown}
          disabled={disabled || sending}
          rows={1}
          placeholder={placeholder}
          className="flex-1 resize-none max-h-28 min-h-[42px] px-3 py-2.5 rounded-xl border border-amber-200/60 bg-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || sending || !text.trim()}
          className="p-2.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-40"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </div>
    </div>
  )
}

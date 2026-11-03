import { useEffect, useState } from 'react'
import { CalendarClock, Hand } from 'lucide-react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import Input from '../common/Input'
import Select from '../common/Select'
import { DAY_SHORT, formatShortDate } from '../../lib/bookingUtils'

const SESSION_PRESETS = [1, 4, 8, 12, 16, 24]

/**
 * Hộp chọn lịch: xác nhận khung giờ muốn xin và **số buổi** muốn học.
 *
 * Mở ra trước khi gửi thay vì gửi thẳng, vì học viên hiếm khi xin đúng một buổi
 * — thường là "em muốn học T3 19:00, khóa 8 buổi". Không hỏi số buổi thì trung
 * tâm chỉ biết giờ nào đông, không biết mở lớp bao nhiêu buổi là đủ.
 *
 * Khi chọn đúng MỘT khung giờ thì cho sửa giờ tự do (gõ tay 19:15–20:45 cũng
 * được). Chọn nhiều khung thì giữ nguyên giờ của từng ô, chỉ hỏi số buổi chung —
 * cho sửa giờ từng ô sẽ thành một cái form dài lê thê.
 */
export default function RequestDialog({ isOpen, cells = [], saving = false, onClose, onSubmit }) {
  const single = cells.length === 1
  const [sessionCount, setSessionCount] = useState('8')
  const [customCount, setCustomCount] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setError('')
    setSessionCount('8')
    setCustomCount('')
    setNote('')
    setStart(cells[0]?.start_time || '')
    setEnd(cells[0]?.end_time || '')
  }, [isOpen, cells])

  const resolvedCount = sessionCount === 'custom' ? Number(customCount) : Number(sessionCount)

  const submit = (e) => {
    e.preventDefault()
    if (!Number.isInteger(resolvedCount) || resolvedCount < 1 || resolvedCount > 200) {
      setError('Số buổi phải là số nguyên từ 1 đến 200')
      return
    }
    if (single) {
      if (!start || !end) {
        setError('Nhập giờ bắt đầu và giờ kết thúc')
        return
      }
      if (end <= start) {
        setError('Giờ kết thúc phải sau giờ bắt đầu')
        return
      }
    }
    setError('')
    onSubmit({
      session_count: resolvedCount,
      note: note.trim() || null,
      ...(single ? { start_time: start, end_time: end } : {}),
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Xin mở lớp giờ này"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={submit} loading={saving} icon={Hand}>
            Gửi nguyện vọng
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-xl border border-primary-200 bg-primary-50 px-3 py-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-primary-900">
            <CalendarClock className="h-4 w-4" />
            {cells.length === 1 ? 'Khung giờ đã chọn' : `${cells.length} khung giờ đã chọn`}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {cells.map((c) => (
              <span key={c.key} className="rounded bg-white px-1.5 py-0.5 text-xs font-medium text-primary-800">
                {DAY_SHORT[c.day_of_week]} {formatShortDate(c.date)} · {c.start_time}–{c.end_time}
              </span>
            ))}
          </div>
        </div>

        {single && (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Giờ bắt đầu"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
            />
            <Input
              label="Giờ kết thúc"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              required
              helperText="Sửa được tự do, không bị giới hạn theo bước giờ"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">
            Muốn học bao nhiêu buổi? <span className="ml-1 text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {SESSION_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSessionCount(String(n))}
                className={
                  sessionCount === String(n)
                    ? 'min-w-[52px] rounded-lg border border-primary-500 bg-primary-600 px-3 py-1.5 text-sm font-medium text-white'
                    : 'min-w-[52px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-primary-200'
                }
              >
                {n} buổi
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSessionCount('custom')}
              className={
                sessionCount === 'custom'
                  ? 'rounded-lg border border-primary-500 bg-primary-600 px-3 py-1.5 text-sm font-medium text-white'
                  : 'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-primary-200'
              }
            >
              Số khác
            </button>
          </div>
          {sessionCount === 'custom' && (
            <div className="mt-2">
              <Input
                inputMode="numeric"
                placeholder="Nhập số buổi"
                value={customCount}
                onChange={(e) => setCustomCount(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </div>
          )}
          {cells.length > 1 && (
            <p className="mt-1 text-sm text-gray-500">
              Áp dụng cho cả {cells.length} khung giờ đã chọn.
            </p>
          )}
        </div>

        <Input
          label="Ghi chú cho trung tâm (tùy chọn)"
          type="textarea"
          rows={2}
          placeholder="Em muốn học kèm riêng, hoặc ghi trình độ hiện tại..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <p className="text-xs text-slate-400">
          Đây là <b>nguyện vọng</b>, chưa phải giữ chỗ. Trung tâm xem giờ nào nhiều người muốn rồi mới
          mở lớp và báo lại cho bạn.
        </p>
      </form>
    </Modal>
  )
}

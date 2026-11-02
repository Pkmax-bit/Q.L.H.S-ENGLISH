import { useEffect, useState } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import Input from '../common/Input'
import Select from '../common/Select'
import { addDaysIso, formatDate, mondayOf } from '../../lib/bookingUtils'

// Tối đa 6 tuần: trùng với CHECK week_count BETWEEN 1 AND 6 ở migration 039,
// và 6 tuần là đủ phủ mọi tháng dương lịch.
const WEEK_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6].map((n) => ({
  value: String(n),
  label: n === 1 ? '1 tuần' : `${n} tuần`,
}))

const emptyForm = () => ({
  title: '',
  description: '',
  week_start: mondayOf(),
  week_count: 1,
  slug: '',
  max_slots_per_person: 0,
  is_open: true,
})

/**
 * Tạo / sửa bảng đăng ký.
 * week_start luôn bị kéo về thứ 2 (backend có CHECK bắt buộc), nên input date
 * ở đây cũng tự snap để người dùng thấy ngay giá trị thật sẽ lưu.
 */
export default function BookingBoardForm({ isOpen, onClose, onSubmit, board = null, saving = false }) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setError('')
    if (board) {
      setForm({
        title: board.title || '',
        description: board.description || '',
        week_start: String(board.week_start || '').slice(0, 10),
        week_count: board.week_count ?? 1,
        slug: board.slug || '',
        max_slots_per_person: board.max_slots_per_person ?? 0,
        is_open: board.is_open !== false,
      })
    } else {
      setForm(emptyForm())
    }
  }, [isOpen, board])

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: value }))
  }

  const submit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setError('Nhập tên bảng, ví dụ "Đăng ký lịch học tuần 03/11"')
      return
    }
    if (!form.week_start) {
      setError('Chọn tuần cho bảng này')
      return
    }
    setError('')
    onSubmit({
      title: form.title.trim(),
      description: form.description.trim() || null,
      week_start: mondayOf(form.week_start),
      week_count: Math.max(1, Math.min(6, Number(form.week_count) || 1)),
      max_slots_per_person: Math.max(0, Number(form.max_slots_per_person) || 0),
      is_open: form.is_open,
      // Để trống = backend tự sinh mã ngẫu nhiên dễ đọc
      ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
    })
  }

  const snapped = form.week_start ? mondayOf(form.week_start) : ''

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={board ? 'Sửa bảng đăng ký' : 'Tạo bảng đăng ký mới'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={submit} loading={saving}>
            {board ? 'Lưu thay đổi' : 'Tạo bảng'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Tên bảng"
          placeholder="Đăng ký lịch học tuần này"
          value={form.title}
          onChange={set('title')}
          required
        />

        <Input
          label="Mô tả / lời nhắn cho người đăng ký"
          type="textarea"
          rows={3}
          placeholder="Mỗi bạn chọn 1 ca. Ca đủ 10 người sẽ khóa."
          value={form.description}
          onChange={set('description')}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label="Tuần bắt đầu"
            type="date"
            value={form.week_start}
            onChange={set('week_start')}
            required
            helperText={snapped && snapped !== form.week_start ? `Sẽ lưu là thứ 2: ${snapped}` : 'Luôn tính từ thứ 2'}
          />

          <Select
            label="Số tuần"
            value={String(form.week_count)}
            onChange={set('week_count')}
            options={WEEK_COUNT_OPTIONS}
            required
          />

          <Input
            label="Số ca tối đa mỗi người / tuần"
            type="number"
            min={0}
            value={form.max_slots_per_person}
            onChange={set('max_slots_per_person')}
            helperText="0 = không giới hạn"
          />
        </div>

        {Number(form.week_count) > 1 && snapped && (
          <p className="rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-800">
            Bảng phủ {form.week_count} tuần: {formatDate(snapped)} – {formatDate(addDaysIso(snapped, Number(form.week_count) * 7 - 1))}.
            Học viên dùng một link duy nhất và tự bấm chuyển tuần; sĩ số mỗi ca tính riêng từng tuần.
          </p>
        )}

        <Input
          label="Mã link (tùy chọn)"
          placeholder="để trống sẽ tự sinh"
          value={form.slug}
          onChange={set('slug')}
          helperText="Link công khai sẽ là /dk/<mã>. Chỉ chữ thường, số và dấu gạch ngang."
        />

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.is_open}
            onChange={set('is_open')}
            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          Mở nhận đăng ký ngay
        </label>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  )
}

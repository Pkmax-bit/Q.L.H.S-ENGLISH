import { useEffect, useState } from 'react'
import clsx from 'clsx'
import Modal from '../common/Modal'
import Button from '../common/Button'
import Input from '../common/Input'
import { DAY_SHORT, WEEK_ORDER } from '../../lib/bookingUtils'

const emptyForm = () => ({
  days_of_week: [],
  start_time: '18:00',
  end_time: '19:30',
  label: '',
  teacher_name: '',
  room_name: '',
  note: '',
  capacity: 10,
  allow_waitlist: false,
  is_active: true,
})

/**
 * Thêm / sửa ca học.
 * Khi thêm mới cho phép chọn nhiều thứ cùng lúc (vd ca 18:00 T2/T4/T6) —
 * đây là cách tạo lịch nhanh nhất, nếu không phải bấm 3 lần cho 3 thứ.
 */
export default function BookingSlotForm({ isOpen, onClose, onSubmit, slot = null, prefill = null, cells = null, saving = false }) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const editing = Boolean(slot)
  // Chế độ lô: tạo ca cho các ô đã quét trên lưới giờ, mỗi ô một thứ + giờ riêng
  const batch = !editing && Array.isArray(cells) && cells.length > 0

  useEffect(() => {
    if (!isOpen) return
    setError('')
    if (slot) {
      setForm({
        days_of_week: [slot.day_of_week],
        start_time: String(slot.start_time || '').slice(0, 5),
        end_time: String(slot.end_time || '').slice(0, 5),
        label: slot.label || '',
        teacher_name: slot.teacher_name || '',
        room_name: slot.room_name || '',
        note: slot.note || '',
        capacity: slot.capacity ?? 10,
        allow_waitlist: Boolean(slot.allow_waitlist),
        is_active: slot.is_active !== false,
      })
    } else {
      // Bấm vào ô trống trên lưới giờ -> điền sẵn thứ và giờ của ô đó
      setForm({ ...emptyForm(), ...(prefill || {}) })
    }
  }, [isOpen, slot, prefill])

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: value }))
  }

  const toggleDay = (dow) => {
    setForm((f) => {
      if (editing) return { ...f, days_of_week: [dow] }
      const has = f.days_of_week.includes(dow)
      return {
        ...f,
        days_of_week: has ? f.days_of_week.filter((d) => d !== dow) : [...f.days_of_week, dow],
      }
    })
  }

  const submit = (e) => {
    e.preventDefault()
    if (!batch) {
      if (!form.days_of_week.length) {
        setError('Chọn ít nhất một thứ trong tuần')
        return
      }
      if (!form.start_time || !form.end_time) {
        setError('Nhập giờ bắt đầu và giờ kết thúc')
        return
      }
      if (form.end_time <= form.start_time) {
        setError('Giờ kết thúc phải sau giờ bắt đầu')
        return
      }
    }
    const capacity = Number(form.capacity)
    if (!Number.isInteger(capacity) || capacity < 1) {
      setError('Sĩ số tối đa phải là số nguyên từ 1 trở lên')
      return
    }

    setError('')
    const base = {
      label: form.label.trim() || null,
      teacher_name: form.teacher_name.trim() || null,
      room_name: form.room_name.trim() || null,
      note: form.note.trim() || null,
      capacity,
      allow_waitlist: form.allow_waitlist,
      is_active: form.is_active,
    }

    if (batch) {
      // Mỗi ô một giờ riêng nên gửi danh sách tường minh, không dùng days_of_week
      return onSubmit({ ...base, slots: cells.map((c) => ({
        day_of_week: c.day_of_week,
        start_time: `${String(c.hour).padStart(2, '0')}:00`,
        // 23h không thể kết thúc lúc 24:00
        end_time: c.hour >= 23 ? '23:59' : `${String(c.hour + 1).padStart(2, '0')}:00`,
      })) })
    }

    onSubmit(
      editing
        ? { ...base, day_of_week: form.days_of_week[0], start_time: form.start_time, end_time: form.end_time }
        : { ...base, days_of_week: form.days_of_week, start_time: form.start_time, end_time: form.end_time }
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? 'Sửa ca học' : 'Thêm ca học'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={submit} loading={saving}>
            {editing ? 'Lưu thay đổi' : `Tạo ${batch ? cells.length : form.days_of_week.length || ''} ca`}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {batch && (
          <div className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2">
            <p className="text-sm font-semibold text-primary-900">
              Tạo {cells.length} ca từ các ô đã chọn
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {cells.map((c) => (
                <span
                  key={`${c.day_of_week}-${c.hour}`}
                  className="rounded bg-white px-1.5 py-0.5 text-xs font-medium text-primary-800"
                >
                  {DAY_SHORT[c.day_of_week]} {String(c.hour).padStart(2, '0')}:00
                </span>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-primary-700">
              Mỗi ca dài 1 tiếng. Các thiết lập bên dưới áp dụng cho cả {cells.length} ca.
            </p>
          </div>
        )}

        <div className={batch ? 'hidden' : undefined}>
          <label className="mb-1 block text-sm font-medium text-stone-700">
            Thứ trong tuần <span className="ml-1 text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {WEEK_ORDER.map((dow) => {
              const active = form.days_of_week.includes(dow)
              return (
                <button
                  key={dow}
                  type="button"
                  onClick={() => toggleDay(dow)}
                  className={clsx(
                    'min-w-[48px] rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'border-primary-500 bg-primary-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-primary-200'
                  )}
                >
                  {DAY_SHORT[dow]}
                </button>
              )
            })}
          </div>
          {!editing && (
            <p className="mt-1 text-sm text-gray-500">
              Chọn nhiều thứ để tạo cùng một ca cho cả tuần.
            </p>
          )}
        </div>

        <div className={clsx('grid grid-cols-1 gap-4', batch ? 'sm:grid-cols-1' : 'sm:grid-cols-3')}>
          {!batch && (
            <Input label="Giờ bắt đầu" type="time" value={form.start_time} onChange={set('start_time')} required />
          )}
          {!batch && (
            <Input label="Giờ kết thúc" type="time" value={form.end_time} onChange={set('end_time')} required />
          )}
          <Input
            label="Sĩ số tối đa"
            type="number"
            min={1}
            max={999}
            value={form.capacity}
            onChange={set('capacity')}
            required
          />
        </div>

        <Input
          label="Tên ca (tùy chọn)"
          placeholder="IELTS 5.0 — cơ bản"
          value={form.label}
          onChange={set('label')}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Giáo viên" placeholder="Cô Lan" value={form.teacher_name} onChange={set('teacher_name')} />
          <Input label="Phòng" placeholder="Phòng 201" value={form.room_name} onChange={set('room_name')} />
        </div>

        <Input
          label="Ghi chú hiện cho người đăng ký"
          type="textarea"
          rows={2}
          value={form.note}
          onChange={set('note')}
        />

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.allow_waitlist}
              onChange={set('allow_waitlist')}
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            Cho phép hàng chờ khi ca đã đầy
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={set('is_active')}
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            Hiện ca này trên bảng công khai
          </label>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  )
}

import { useState } from 'react'
import { CalendarPlus, Hand, Phone, ThumbsDown, Users } from 'lucide-react'
import clsx from 'clsx'
import Button from '../common/Button'
import Modal from '../common/Modal'
import Input from '../common/Input'
import EmptyState from '../common/EmptyState'
import LoadingSpinner from '../common/LoadingSpinner'
import { DAY_SHORT, formatShortDate } from '../../lib/bookingUtils'

/**
 * Nguyện vọng giờ học, gom theo khung giờ.
 *
 * Sắp xếp theo SỐ NGƯỜI MUỐN giảm dần, không theo thời gian gửi: việc của admin
 * là "mở ca nào trước", nên giờ đông nhất phải nằm trên cùng.
 */
export default function RequestDemandPanel({
  demand = [],
  loading = false,
  onOpenSlot,
  onReject,
  busy = false,
}) {
  const [openTarget, setOpenTarget] = useState(null)
  const [form, setForm] = useState({ capacity: 10, label: '', teacher_name: '', room_name: '' })

  const startOpen = (bucket) => {
    setForm({ capacity: 10, label: '', teacher_name: '', room_name: '' })
    setOpenTarget(bucket)
  }

  const submitOpen = (e) => {
    e.preventDefault()
    if (!openTarget) return
    onOpenSlot({
      session_date: openTarget.date,
      start_time: openTarget.start_time,
      capacity: Math.max(1, Number(form.capacity) || 10),
      label: form.label.trim() || null,
      teacher_name: form.teacher_name.trim() || null,
      room_name: form.room_name.trim() || null,
    })
    setOpenTarget(null)
  }

  if (loading) return <LoadingSpinner />

  if (demand.length === 0) {
    return (
      <EmptyState
        message="Chưa có nguyện vọng nào. Học viên bấm vào ô trống trên lưới giờ để xin mở lớp."
        icon={Hand}
      />
    )
  }

  const maxCount = demand[0]?.count || 1

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Xếp theo số người muốn, nhiều nhất lên đầu. Bấm <b>Mở ca</b> để tạo ca học đúng khung giờ đó
        và duyệt luôn các nguyện vọng cùng giờ.
      </p>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {demand.map((b) => (
          <div key={b.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-base font-semibold text-stone-900">
                  {DAY_SHORT[b.day_of_week]} {formatShortDate(b.date)} · {b.start_time}–{b.end_time}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm font-medium text-amber-700">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {b.count} người muốn học giờ này
                  </span>
                  {b.total_sessions > b.count && (
                    <span className="text-xs text-slate-500">· tổng {b.total_sessions} buổi</span>
                  )}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-sm font-bold text-amber-800">
                {b.count}
              </span>
            </div>

            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-amber-400"
                style={{ width: `${Math.round((b.count / maxCount) * 100)}%` }}
              />
            </div>

            <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
              {b.people.map((p, i) => (
                <li key={`${b.key}-${i}`} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="truncate text-sm text-stone-800">
                    {p.full_name}
                    {p.session_count > 1 && (
                      <span className="ml-1 text-xs text-slate-400">· {p.session_count} buổi</span>
                    )}
                  </span>
                  <a
                    href={`tel:${p.phone}`}
                    className="flex shrink-0 items-center gap-1 text-xs text-primary-700 hover:underline"
                  >
                    <Phone className="h-3 w-3" />
                    {p.phone}
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex gap-2">
              <Button size="sm" icon={CalendarPlus} className="flex-1" disabled={busy} onClick={() => startOpen(b)}>
                Mở ca
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={ThumbsDown}
                disabled={busy}
                className="text-slate-500 hover:bg-red-50 hover:text-red-500"
                onClick={() => onReject(b)}
              >
                Từ chối
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={Boolean(openTarget)}
        onClose={() => setOpenTarget(null)}
        title="Mở ca từ nguyện vọng"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenTarget(null)} disabled={busy}>
              Hủy
            </Button>
            <Button onClick={submitOpen} loading={busy}>
              Mở ca
            </Button>
          </>
        }
      >
        <form onSubmit={submitOpen} className="space-y-4">
          {openTarget && (
            <p className="rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-900">
              {DAY_SHORT[openTarget.day_of_week]} {formatShortDate(openTarget.date)} ·{' '}
              {openTarget.start_time}–{openTarget.end_time} — <b>{openTarget.count} người</b> đang chờ,
              tổng <b>{openTarget.total_sessions} buổi</b>.
              <span className="mt-1 block text-xs text-primary-700">
                Ca này áp dụng cho mọi tuần của bảng. Nguyện vọng cùng giờ ở tuần khác vẫn giữ nguyên
                để bạn tự quyết.
              </span>
            </p>
          )}
          <div className={clsx('grid grid-cols-1 gap-4 sm:grid-cols-2')}>
            <Input
              label="Sĩ số tối đa"
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              required
            />
            <Input
              label="Tên ca"
              placeholder="Giao tiếp cơ bản"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Giáo viên"
              value={form.teacher_name}
              onChange={(e) => setForm((f) => ({ ...f, teacher_name: e.target.value }))}
            />
            <Input
              label="Phòng"
              value={form.room_name}
              onChange={(e) => setForm((f) => ({ ...f, room_name: e.target.value }))}
            />
          </div>
          <p className="text-xs text-slate-400">
            Mở ca xong, những người đã xin giờ này <b>vẫn phải tự vào giữ chỗ</b> — hệ thống không giữ
            hộ, vì sĩ số có thể ít hơn số người muốn.
          </p>
        </form>
      </Modal>
    </div>
  )
}

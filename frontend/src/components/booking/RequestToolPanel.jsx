import { useEffect, useRef, useState } from 'react'
import { CalendarPlus, Check, Clock, Phone, StickyNote, ThumbsDown, Trash2, User, X } from 'lucide-react'
import clsx from 'clsx'
import Button from '../common/Button'
import { DAY_SHORT, SLOT_COLORS, colorClasses, formatShortDate } from '../../lib/bookingUtils'
import { useIsNarrow } from '../../hooks/useIsNarrow'

const COLOR_KEYS = Object.keys(SLOT_COLORS)

const STATUS_LABEL = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Đã từ chối',
  cancelled: 'Đã hủy',
}

/**
 * Bảng công cụ của MỘT buổi đã đăng ký, mở bằng chuột phải trên lưới giờ.
 *
 * Gom hết việc hay làm vào một chỗ thay vì menu chữ rồi mở tiếp hộp thoại:
 * sửa giờ, ghi chú, màu, duyệt / từ chối / hủy đều nằm ngay đây. Bấm phải một
 * cái là thấy luôn buổi đó đang màu gì, giờ nào, ghi chú gì — không phải mở
 * ra mới biết.
 *
 * `canAdmin` mở phần duyệt / hủy, `canColor` mở select học viên + bảng màu
 * (chỉ admin, khớp authorize('admin') ở backend).
 *
 * MÀU GẮN VỚI HỌC VIÊN, không gắn từng buổi: đổi màu ở đây là đổi màu của
 * người đó trên mọi buổi, và chọn học viên khác thì khối đổi sang màu của
 * người mới. Nhờ vậy nhìn lưới là biết ai học giờ nào mà không phải tô lại
 * từng buổi. Học viên ở trang công khai không thấy hai thứ này — danh sách
 * tên và số điện thoại người khác không được lộ ra link công khai.
 */
export default function RequestToolPanel({
  state,
  onClose,
  canAdmin = false,
  canColor = false,
  students = [],
  busy = false,
  onSave,
  onSetColor,
  onChangeStudent,
  onReview,
  onOpenSlot,
  onCancel,
}) {
  const ref = useRef(null)
  // Điện thoại: không thả bảng 280px vào đúng chỗ ngón tay vừa chạm — ngón tay
  // che mất, mà màn 375px thì bảng gần như chiếm hết. Cho trượt lên từ đáy,
  // kiểu sheet quen thuộc, và có nền mờ để biết phải đóng trước khi làm việc khác.
  const narrow = useIsNarrow()
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [form, setForm] = useState({ start_time: '', end_time: '', note: '' })

  const request = state?.payload?.request || null

  useEffect(() => {
    if (!request) return
    setForm({
      start_time: request.start_time || '',
      end_time: request.end_time || '',
      note: request.note || '',
    })
  }, [request])

  useEffect(() => {
    if (!state) return undefined
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    // Cuộn trang thì bảng trôi khỏi ô gốc, đóng luôn cho đỡ lạc
    window.addEventListener('scroll', onClose, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onClose, true)
    }
  }, [state, onClose])

  // Né mép màn hình sau khi biết kích thước thật — mở sát cạnh phải/dưới là
  // mất nửa bảng, không bấm được nút nào
  useEffect(() => {
    if (!state || narrow) return
    const el = ref.current
    const w = el?.offsetWidth || 280
    const h = el?.offsetHeight || 360
    setPos({
      x: Math.max(8, Math.min(state.x, window.innerWidth - w - 8)),
      y: Math.max(8, Math.min(state.y, window.innerHeight - h - 8)),
    })
  }, [state, narrow])

  if (!state || !request) return null

  const dow = new Date(`${request.date}T00:00:00`).getDay()
  const timeChanged =
    form.start_time !== (request.start_time || '') || form.end_time !== (request.end_time || '')
  const noteChanged = (form.note || '') !== (request.note || '')
  const dirty = timeChanged || noteChanged
  const timeValid = form.start_time && form.end_time && form.end_time > form.start_time

  return (
    <>
      {narrow && <div className="fixed inset-0 z-[55] bg-stone-900/30" aria-hidden="true" />}
      <div
        ref={ref}
        role="dialog"
        aria-label="Công cụ buổi đăng ký"
        style={narrow ? undefined : { left: pos.x, top: pos.y }}
        className={clsx(
          'fixed z-[60] overflow-y-auto border-slate-200 bg-white shadow-xl shadow-slate-900/10',
          narrow
            ? 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t pb-[max(12px,env(safe-area-inset-bottom))]'
            : 'w-[280px] overflow-hidden rounded-xl border'
        )}
      >
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-stone-900">
            {request.full_name || 'Buổi đã đăng ký'}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {DAY_SHORT[dow]} {formatShortDate(request.date)} · {request.start_time}–
            {request.end_time}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className={clsx(
                'rounded px-1.5 py-0.5 text-[10px] font-semibold',
                request.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-700'
                  : request.status === 'rejected' || request.status === 'cancelled'
                    ? 'bg-slate-200 text-slate-600'
                    : 'bg-amber-100 text-amber-700'
              )}
            >
              {STATUS_LABEL[request.status] || request.status}
            </span>
            {request.session_count > 1 && (
              <span className="text-[10px] text-slate-400">{request.session_count} buổi</span>
            )}
            {canAdmin && request.phone && (
              <a
                href={`tel:${request.phone}`}
                className="flex items-center gap-0.5 text-[10px] text-primary-700 hover:underline"
              >
                <Phone className="h-2.5 w-2.5" />
                {request.phone}
              </a>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          title="Đóng"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className={clsx('space-y-3 px-3 py-3', narrow && 'space-y-4 px-4 py-4')}>
        {canColor && students.length > 0 && (
          <div>
            <p className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500">
              <User className="h-3 w-3" /> Học viên
            </p>
            <select
              value={request.registrant_id || ''}
              disabled={busy}
              onChange={(e) => onChangeStudent?.(request, e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-primary-400 focus:outline-none"
            >
              {!request.registrant_id && <option value="">— chọn học viên —</option>}
              {students.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} · {p.phone}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              Đổi người thì khối đổi theo màu của người đó.
            </p>
          </div>
        )}

        {canColor && (
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">
              Màu của {request.full_name || 'học viên'} — áp cho mọi buổi của người này
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {COLOR_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  disabled={busy}
                  title={`Tô màu ${key}`}
                  onClick={() => onSetColor?.(request, key)}
                  className={clsx(
                    'h-5 w-5 rounded-full transition-transform hover:scale-110 disabled:opacity-50',
                    colorClasses(key).dot,
                    request.color === key && 'ring-2 ring-stone-700 ring-offset-1'
                  )}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500">
            <Clock className="h-3 w-3" /> Giờ học
          </p>
          <div className="flex items-center gap-1.5">
            <input
              type="time"
              value={form.start_time}
              disabled={busy}
              onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-primary-400 focus:outline-none"
            />
            <span className="text-slate-400">–</span>
            <input
              type="time"
              value={form.end_time}
              disabled={busy}
              onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-primary-400 focus:outline-none"
            />
          </div>
          {timeChanged && !timeValid && (
            <p className="mt-1 text-[11px] text-red-500">Giờ kết thúc phải sau giờ bắt đầu</p>
          )}
        </div>

        <div>
          <p className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500">
            <StickyNote className="h-3 w-3" /> Ghi chú
          </p>
          <textarea
            rows={2}
            value={form.note}
            disabled={busy}
            placeholder="Học kèm riêng, trình độ hiện tại..."
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            className="w-full resize-none rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-primary-400 focus:outline-none"
          />
        </div>

        <Button
          size="sm"
          className="w-full"
          icon={Check}
          loading={busy}
          disabled={!dirty || (timeChanged && !timeValid)}
          onClick={() =>
            onSave?.(request, {
              ...(timeChanged ? { start_time: form.start_time, end_time: form.end_time } : {}),
              ...(noteChanged ? { note: form.note.trim() || null } : {}),
            })
          }
        >
          {dirty ? 'Lưu thay đổi' : 'Chưa có thay đổi'}
        </Button>

        {canAdmin && (
          <div className="space-y-1.5 border-t border-slate-100 pt-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              icon={CalendarPlus}
              disabled={busy}
              onClick={() => onOpenSlot?.(request)}
            >
              Mở ca từ giờ này
            </Button>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                icon={Check}
                disabled={busy || request.status === 'approved'}
                onClick={() => onReview?.(request, 'approved')}
              >
                Duyệt
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="flex-1 text-slate-500 hover:bg-red-50 hover:text-red-500"
                icon={ThumbsDown}
                disabled={busy || request.status === 'rejected'}
                onClick={() => onReview?.(request, 'rejected')}
              >
                Từ chối
              </Button>
            </div>
          </div>
        )}

        <Button
          size="sm"
          variant="ghost"
          className="w-full text-red-600 hover:bg-red-50"
          icon={Trash2}
          disabled={busy}
          onClick={() => onCancel?.(request)}
        >
          {canAdmin ? 'Hủy buổi đăng ký' : 'Rút đăng ký'}
        </Button>
        </div>
      </div>
    </>
  )
}

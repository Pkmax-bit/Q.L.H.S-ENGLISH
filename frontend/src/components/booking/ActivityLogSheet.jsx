import { useEffect, useState } from 'react'
import { History, X } from 'lucide-react'
import clsx from 'clsx'
import LoadingSpinner from '../common/LoadingSpinner'
import { formatDateTime } from '../../lib/bookingUtils'
import { useIsNarrow } from '../../hooks/useIsNarrow'

const ACTION_LABEL = {
  'request.create': 'đăng ký buổi học',
  'request.update': 'sửa buổi học',
  'request.cancel': 'rút buổi học',
  'request.detach': 'gỡ vào khu chờ',
  'pool.schedule': 'xếp từ khu chờ vào lưới',
  'registrant.color': 'đổi màu học viên',
  'registrant.price': 'đặt học phí',
  'message.send': 'gửi tin nhắn',
}

const FIELD_LABEL = {
  ngay: 'ngày',
  gio: 'giờ',
  ghi_chu: 'ghi chú',
  hoc_vien: 'học viên',
  mau: 'màu',
  hoc_phi: 'học phí',
  so_tien: 'số tiền',
  hoan_thanh: 'hoàn thành',
  danh_dau: 'đánh dấu',
  to_dam: 'tô đậm',
}

/** "giờ: 07:30–08:30 → 09:00–10:00" — đọc một dòng là biết đổi gì thành gì */
function describe(detail) {
  if (!detail || typeof detail !== 'object') return null
  const parts = []
  for (const [key, value] of Object.entries(detail)) {
    const name = FIELD_LABEL[key] || key
    if (value && typeof value === 'object' && ('tu' in value || 'thanh' in value)) {
      parts.push(
        value.tu !== undefined && value.tu !== null
          ? `${name}: ${value.tu} → ${value.thanh ?? '(trống)'}`
          : `${name}: ${value.thanh ?? '(trống)'}`
      )
    } else {
      parts.push(`${name}: ${value}`)
    }
  }
  return parts.join(' · ')
}

/**
 * Nhật ký thao tác của một bảng đăng ký.
 *
 * Lịch là thứ nhiều người cùng sửa, nên khi một buổi biến mất thì câu hỏi đầu
 * tiên luôn là "ai làm". Danh sách xếp mới nhất lên đầu vì đó là thứ người ta
 * đi tìm: vừa có gì thay đổi.
 */
export default function ActivityLogSheet({ open, onClose, load }) {
  const narrow = useIsNarrow()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError('')
    load()
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.response?.data?.message || 'Không tải được nhật ký'))
      .finally(() => setLoading(false))
  }, [open, load])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-[55] bg-stone-900/30" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label="Nhật ký thao tác"
        className={clsx(
          'fixed z-[60] flex flex-col bg-white shadow-xl shadow-slate-900/10',
          narrow
            ? 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl'
            : 'right-4 top-16 max-h-[75vh] w-[420px] rounded-2xl'
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="flex items-center gap-1.5 font-display text-base font-semibold text-stone-900">
            <History className="h-4 w-4 text-primary-600" />
            Nhật ký thao tác
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading && <LoadingSpinner />}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {!loading && !error && rows.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">Chưa có thao tác nào được ghi.</p>
          )}
          <ul className="space-y-2.5">
            {rows.map((r) => {
              const detail = describe(r.detail)
              return (
                <li key={r.id} className="border-b border-slate-50 pb-2.5 last:border-b-0">
                  <p className="text-sm text-stone-800">
                    <span className="font-semibold">{r.actor_name || 'Ai đó'}</span>{' '}
                    {ACTION_LABEL[r.action] || r.action}
                  </p>
                  {detail && <p className="mt-0.5 text-xs text-slate-600">{detail}</p>}
                  <p className="mt-0.5 text-[11px] text-slate-400">{formatDateTime(r.created_at)}</p>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </>
  )
}

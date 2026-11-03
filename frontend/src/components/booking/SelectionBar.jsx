import { Check, X } from 'lucide-react'
import Button from '../common/Button'

/**
 * Thanh hành động nổi lên khi đã chọn ít nhất một khung giờ.
 *
 * Đặt dính dưới đáy vùng nội dung chứ không nằm trong lưới: lưới cao 17 hàng,
 * nút xác nhận mà nằm cuối lưới thì chọn ô ở hàng 8 xong phải cuộn xuống tận
 * cùng mới bấm được.
 */
export default function SelectionBar({
  count,
  items = [],
  actionLabel,
  loading = false,
  disabled = false,
  onConfirm,
  onClear,
  hint,
}) {
  if (count === 0) return null

  return (
    <div className="sticky bottom-24 z-30 mt-3">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 rounded-2xl border border-primary-200 bg-white/95 px-4 py-3 shadow-lg shadow-primary-900/5 backdrop-blur">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-stone-900">Đã chọn {count} khung giờ</p>
          {items.length > 0 && (
            <p className="mt-0.5 truncate text-xs text-slate-500" title={items.join(' · ')}>
              {items.slice(0, 4).join(' · ')}
              {items.length > 4 ? ` · +${items.length - 4} nữa` : ''}
            </p>
          )}
          {hint && <p className="mt-0.5 text-xs text-amber-600">{hint}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" icon={X} onClick={onClear} disabled={loading}>
            Bỏ chọn
          </Button>
          <Button size="sm" icon={Check} loading={loading} disabled={disabled} onClick={onConfirm}>
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

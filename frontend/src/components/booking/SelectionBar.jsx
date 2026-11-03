import { Check, X } from 'lucide-react'
import Button from '../common/Button'

/**
 * Thanh hành động nổi lên khi đã chọn ít nhất một khung giờ.
 *
 * Đặt dính dưới đáy vùng nội dung chứ không nằm trong lưới: lưới cao 17 hàng,
 * nút xác nhận mà nằm cuối lưới thì chọn ô ở hàng 8 xong phải cuộn xuống tận
 * cùng mới bấm được.
 *
 * Trên điện thoại ép MỘT HÀNG: để nó tự xuống dòng thì thanh cao 258px trên
 * màn 812px, che mất gần nửa lưới. Chữ dài rút gọn (`shortLabel`), nút "Bỏ
 * chọn" còn mỗi dấu X, danh sách khung giờ cắt một dòng.
 */
export default function SelectionBar({
  count,
  items = [],
  actionLabel,
  shortLabel,
  loading = false,
  disabled = false,
  onConfirm,
  onClear,
  hint,
}) {
  if (count === 0) return null

  return (
    <div className="sticky bottom-20 z-30 mt-3 sm:bottom-24">
      <div className="mx-auto flex max-w-3xl flex-nowrap items-center gap-2 rounded-2xl border border-primary-200 bg-white/95 px-3 py-2 shadow-lg shadow-primary-900/5 backdrop-blur sm:gap-3 sm:px-4 sm:py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-stone-900 sm:text-sm">
            Đã chọn {count} khung giờ
          </p>
          {items.length > 0 && (
            <p className="truncate text-[11px] text-slate-500 sm:text-xs" title={items.join(' · ')}>
              {items.slice(0, 4).join(' · ')}
              {items.length > 4 ? ` · +${items.length - 4} nữa` : ''}
            </p>
          )}
          {hint && <p className="truncate text-[11px] text-amber-600 sm:text-xs">{hint}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" icon={X} onClick={onClear} disabled={loading} title="Bỏ chọn">
            <span className="hidden sm:inline">Bỏ chọn</span>
          </Button>
          <Button size="sm" icon={Check} loading={loading} disabled={disabled} onClick={onConfirm}>
            <span className="hidden sm:inline">{actionLabel}</span>
            <span className="sm:hidden">{shortLabel || actionLabel}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

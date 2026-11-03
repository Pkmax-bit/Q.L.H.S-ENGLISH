import { CalendarPlus, Hand, MousePointerClick, Pencil, Trash2, X } from 'lucide-react'
import clsx from 'clsx'
import { useIsNarrow } from '../../hooks/useIsNarrow'

/**
 * Hướng dẫn đăng ký, mở từ nút "?" trên thanh công cụ.
 *
 * Gom hết phần chỉ dẫn vào đây để mặt chính của trang chỉ còn lịch: trước đây
 * mỗi thao tác được giải thích bằng một dòng chữ xám nằm rải rác, cộng lại dài
 * hơn cả cái lưới mà vẫn không ai đọc.
 *
 * Thao tác trên máy tính và điện thoại khác nhau thật (kéo chuột / chạm hai
 * đầu, chuột phải / nhấn giữ) nên hướng dẫn đổi theo đúng máy đang dùng, không
 * bắt người ta tự lọc xem dòng nào dành cho mình.
 */
export default function BookingHelpSheet({ open, onClose }) {
  const narrow = useIsNarrow()
  if (!open) return null

  const steps = [
    {
      icon: MousePointerClick,
      title: 'Chọn giờ muốn học',
      body: narrow
        ? 'Chạm ô trống ở giờ bắt đầu, rồi chạm ô ở giờ kết thúc — cả khoảng giữa thành một buổi.'
        : 'Giữ chuột kéo dọc qua các ô trống. Các ô liền nhau trong cùng một ngày gộp thành một buổi.',
    },
    {
      icon: CalendarPlus,
      title: 'Bấm Đăng ký',
      body: 'Nút ở thanh dưới màn hình. Chọn được nhiều buổi rồi gửi một lần.',
    },
    {
      icon: Hand,
      title: 'Chờ trung tâm xếp lớp',
      body: 'Buổi đã đăng ký hiện thành khối màu kèm tên bạn. Đây là nguyện vọng, trung tâm xem rồi mới mở lớp.',
    },
  ]

  const actions = [
    {
      icon: Pencil,
      label: narrow ? 'Nhấn giữ vào buổi đã đăng ký' : 'Bấm chuột phải vào buổi đã đăng ký',
      body: 'Mở bảng công cụ: sửa giờ, thêm ghi chú.',
    },
    {
      icon: Trash2,
      label: 'Bấm vào buổi đã đăng ký',
      body: 'Rút buổi đó. Ca có sẵn mà bạn đã giữ chỗ thì bấm là hủy chỗ.',
    },
    {
      icon: CalendarPlus,
      label: 'Ca trung tâm đã mở',
      body: 'Bấm để chọn, rồi bấm Giữ chỗ ở thanh dưới. Hết chỗ thì ô bị mờ.',
    },
  ]

  return (
    <>
      <div className="fixed inset-0 z-[55] bg-stone-900/30" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label="Hướng dẫn đăng ký"
        className={clsx(
          'fixed z-[60] overflow-y-auto bg-white shadow-xl shadow-slate-900/10',
          narrow
            ? 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl pb-[max(16px,env(safe-area-inset-bottom))]'
            : 'left-1/2 top-1/2 w-[440px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl'
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="font-display text-base font-semibold text-stone-900">Cách đăng ký</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
                    <s.icon className="h-4 w-4 text-primary-600" />
                    {s.title}
                  </p>
                  <p className="mt-0.5 text-sm leading-snug text-slate-600">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="border-t border-slate-100 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Thao tác khác
            </p>
            <ul className="space-y-2.5">
              {actions.map((a) => (
                <li key={a.label} className="flex gap-2.5">
                  <a.icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-800">{a.label}</p>
                    <p className="text-sm leading-snug text-slate-500">{a.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-snug text-slate-500">
            Ô <b>Bước giờ</b> chia nhỏ lưới tới 5 phút nếu bạn cần giờ lẻ. Số chỗ tự cập nhật, không
            cần tải lại trang.
          </p>
        </div>
      </div>
    </>
  )
}

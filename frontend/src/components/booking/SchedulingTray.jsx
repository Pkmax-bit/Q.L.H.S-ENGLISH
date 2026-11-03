import { Hourglass, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { colorClasses } from '../../lib/bookingUtils'

/**
 * Khu chờ sắp xếp: chỗ để tạm những buổi chưa xếp được giờ.
 *
 * Gỡ một buổi khỏi lưới thì nó rơi xuống đây kèm thời lượng, kéo từ đây lên
 * lưới là xếp lại vào giờ mới. Người ta vẫn muốn học — chỉ là giờ cũ không
 * xếp được — nên xóa thẳng là bắt học viên đăng ký lại từ đầu.
 *
 * Bản thân khay cũng là vùng thả: kéo khối từ lưới thả vào đây = gỡ ra.
 */
export default function SchedulingTray({ items = [], busy = false, onDetach, onRemove }) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        let payload = null
        try {
          payload = JSON.parse(e.dataTransfer.getData('text/plain') || 'null')
        } catch {
          payload = null
        }
        if (payload?.kind === 'request') onDetach?.(payload.id)
      }}
      className="mb-3 rounded-2xl border-2 border-dashed border-primary-300 bg-primary-50/40 p-3"
    >
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary-800">
        <Hourglass className="h-3.5 w-3.5" />
        Khu chờ sắp xếp ({items.length})
        <span className="ml-1 font-normal text-primary-600">
          — kéo khối từ lưới thả vào đây để gỡ, kéo từ đây lên lưới để xếp giờ mới
        </span>
      </p>

      {items.length === 0 ? (
        <p className="py-2 text-center text-xs text-slate-400">Chưa có ai chờ xếp.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((it) => {
            // listPool trả full_name/color ở ngoài cùng, không lồng trong registrant
            const tone = colorClasses(it.color)
            return (
              <div
                key={it.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'pool', id: it.id }))
                }}
                className={clsx(
                  'flex cursor-grab items-center gap-2 rounded-lg border px-2 py-1 text-xs shadow-sm active:cursor-grabbing',
                  tone.border,
                  tone.bg,
                  busy && 'opacity-50'
                )}
              >
                <span className={clsx('h-2 w-2 shrink-0 rounded-full', tone.dot)} />
                <span className="font-medium text-stone-800">
                  {it.full_name || it.phone || 'Học viên'}
                </span>
                <span className="text-slate-500">{it.duration_minutes}′</span>
                <button
                  type="button"
                  disabled={busy}
                  title="Bỏ khỏi khu chờ"
                  onClick={() => onRemove?.(it.id)}
                  className="text-slate-400 hover:text-red-500 disabled:opacity-40"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

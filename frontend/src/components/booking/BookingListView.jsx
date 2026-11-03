import { useMemo } from 'react'
import { BadgeCheck, CalendarDays, Star, StickyNote } from 'lucide-react'
import clsx from 'clsx'
import { DAY_SHORT, colorClasses, formatMoney, formatShortDate } from '../../lib/bookingUtils'

/**
 * Tuần đang xem dưới dạng DANH SÁCH: mỗi ngày một nhóm, mỗi buổi một dòng.
 *
 * Lưới giờ trả lời "giờ nào còn trống" — nó phải vẽ cả 17 giờ dù cả tuần chỉ
 * có bốn buổi, nên muốn đọc "tuần này dạy những ai, thu bao nhiêu" thì phải
 * đảo mắt khắp màn. Danh sách trả lời đúng câu hỏi đó: chỉ in buổi CÓ THẬT,
 * theo thứ tự thời gian, kèm tiền và dấu hoàn thành.
 *
 * Bấm một dòng mở đúng bảng công cụ như bấm khối trên lưới — hai dạng xem
 * dùng chung một đường sửa, không có đường tắt riêng nào dễ lệch dữ liệu.
 */
/** Số tiền, nhưng chưa đặt thì là "—" chứ không phải 0 ₫ */
const tien = (v) => (v === null || v === undefined ? '—' : formatMoney(v))

export default function BookingListView({
  requests = [],
  weekStart,
  isManager = false,
  onOpen,
  emptyHint = 'Tuần này chưa có buổi nào.',
}) {
  // Gom theo ngày rồi sắp theo giờ. Dữ liệu từ server đã sắp theo ngày nhưng
  // không theo giờ, mà danh sách đọc theo thứ tự thời gian mới có nghĩa.
  const groups = useMemo(() => {
    const days = []
    const base = weekStart ? new Date(`${weekStart}T00:00:00`) : null
    if (base) {
      for (let i = 0; i < 7; i += 1) {
        const d = new Date(base)
        d.setDate(d.getDate() + i)
        days.push(d.toISOString().slice(0, 10))
      }
    }
    // Server trả buổi của CẢ BẢNG (4 tuần) để lưới đổi tuần không phải gọi
    // lại; danh sách thì chỉ in đúng tuần đang xem, nên bỏ ngày ngoài khung.
    const byDate = new Map(days.map((d) => [d, []]))
    for (const r of requests) {
      if (byDate.has(r.date)) byDate.get(r.date).push(r)
    }
    return [...byDate.entries()]
      .filter(([, list]) => list.length > 0)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, list]) => ({
        date,
        list: [...list].sort((a, b) => a.start_time.localeCompare(b.start_time)),
      }))
  }, [requests, weekStart])

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
        <CalendarDays className="mx-auto mb-2 h-6 w-6 text-slate-300" />
        <p className="text-sm text-slate-500">{emptyHint}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-2xl border border-slate-200 bg-white">
      {groups.map(({ date, list }) => (
        <section key={date}>
          <h3 className="sticky top-0 z-10 flex items-baseline gap-2 border-b border-slate-100 bg-slate-50/95 px-4 py-2 backdrop-blur">
            <span className="text-sm font-semibold text-slate-700">
              {DAY_SHORT[new Date(`${date}T00:00:00`).getDay()]}
            </span>
            <span className="text-xs text-slate-400">{formatShortDate(date)}</span>
            <span className="ml-auto text-xs text-slate-400">{list.length} buổi</span>
          </h3>
          <ul className="divide-y divide-slate-100">
            {list.map((r) => {
              const mau = colorClasses(r.color)
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={(e) => onOpen?.(r, e)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-primary-50/50 sm:gap-3 sm:px-4"
                  >
                    <span className={clsx('h-8 w-1 shrink-0 rounded-full', mau.dot)} />
                    {/* Màn 375px: giờ và tên NẰM CHUNG một dòng chứ không phải
                        hai cột cố định. Hai cột cố định ăn mất 190px, tên người
                        Việt dài nên chỉ còn trơ lại chữ cái đầu. */}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="shrink-0 text-sm font-medium tabular-nums text-slate-700">
                          {r.start_time}–{r.end_time}
                        </span>
                        <span
                          className={clsx(
                            'min-w-0 truncate text-sm text-slate-800',
                            r.is_bold && 'font-bold'
                          )}
                        >
                          {r.full_name || 'Buổi của bạn'}
                        </span>
                      </span>
                      {r.note && (
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                          <StickyNote className="h-3 w-3 shrink-0" />
                          <span className="truncate">{r.note}</span>
                        </span>
                      )}
                    </span>
                    {r.is_marked && <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-500" />}
                    {r.done_at && (
                      <span className="flex shrink-0 items-center gap-1 rounded-md border border-red-300 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-600">
                        <BadgeCheck className="h-3 w-3" />
                        Xong
                      </span>
                    )}
                    {isManager && (
                      <span
                        className={clsx(
                          'shrink-0 text-right text-sm tabular-nums sm:w-24',
                          r.done_at ? 'font-semibold text-emerald-700' : 'text-slate-300'
                        )}
                      >
                        {/* Chưa có số thì in "—" chứ đừng in 0 ₫: 0 là đã quyết
                            dạy miễn phí, còn "—" là chưa ai đặt giá bao giờ */}
                        {tien(r.done_at ? r.amount : r.price_per_session)}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}

    </div>
  )
}

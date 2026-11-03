import { useEffect, useMemo, useState } from 'react'
import { Check, Users, Wallet, X } from 'lucide-react'
import clsx from 'clsx'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import { colorClasses, formatMoney } from '../../lib/bookingUtils'
import { useIsNarrow } from '../../hooks/useIsNarrow'

/**
 * Hộp quản lý học viên của bảng: đặt giá MỘT BUỔI cho từng người và xem đã
 * thu được bao nhiêu.
 *
 * Giá ở đây chỉ là giá MẶC ĐỊNH — nó được điền sẵn vào ô tiền lúc đóng dấu
 * hoàn thành, còn số tiền thật của mỗi buổi nằm trên chính buổi đó. Vì vậy
 * sửa giá ở đây KHÔNG làm đổi tổng tiền của những buổi đã chốt; muốn sửa tiền
 * một buổi cũ thì mở đúng buổi đó ra sửa.
 *
 * Cột "Đã xong" đếm buổi có đóng dấu hoàn thành, không phải mọi buổi đã đăng
 * ký — tiền chỉ tính khi đã dạy.
 */
export default function StudentMoneySheet({ open, onClose, load, onSetPrice, busy = false }) {
  const narrow = useIsNarrow()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  // Giá đang gõ dở, theo từng người — không đụng vào rows để còn so được với
  // giá đã lưu mà biết nút "lưu" có cần hiện hay không
  const [draft, setDraft] = useState({})

  useEffect(() => {
    if (!open) return
    let huy = false
    setLoading(true)
    Promise.resolve(load())
      .then((data) => {
        if (huy) return
        // Người của trung tâm cũng có buổi trên bảng (dạy, hoặc giữ chỗ hộ)
        // nên lọt vào danh sách chung. Ở đây là sổ HỌC PHÍ — giáo viên không
        // đóng tiền, để tên họ vào thì tổng thu luôn kèm một dòng vô nghĩa.
        const list = (Array.isArray(data) ? data : []).filter((p) => !p.is_manager)
        setRows(list)
        setDraft({})
      })
      .finally(() => !huy && setLoading(false))
    return () => {
      huy = true
    }
  }, [open, load])

  const tong = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          done: acc.done + (r.done_total || 0),
          amount: acc.amount + (r.amount_total || 0),
        }),
        { done: 0, amount: 0 }
      ),
    [rows]
  )

  if (!open) return null

  const luu = async (row) => {
    const value = draft[row.id]
    const saved = await onSetPrice(row.id, value)
    if (saved === false) return
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? { ...r, price_per_session: value === '' ? null : Math.round(Number(value)) }
          : r
      )
    )
    setDraft((d) => {
      const next = { ...d }
      delete next[row.id]
      return next
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/30" onClick={onClose} aria-hidden="true" />
      <div
        className={clsx(
          'fixed z-50 flex flex-col overflow-hidden bg-white shadow-2xl',
          narrow
            ? 'inset-x-0 bottom-0 top-16 rounded-t-2xl'
            : 'right-4 top-16 bottom-16 w-[min(640px,calc(100vw-2rem))] rounded-2xl border border-slate-200'
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Users className="h-4 w-4 text-primary-600" />
            Học viên &amp; học phí
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-16">
              <LoadingSpinner />
            </div>
          ) : rows.length === 0 ? (
            <p className="px-4 py-16 text-center text-sm text-slate-500">
              Chưa có học viên nào trên bảng này.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((r) => {
                const dang = draft[r.id]
                const goDo = dang !== undefined
                const hienTai = r.price_per_session === null ? '' : String(r.price_per_session)
                const doi = goDo && dang !== hienTai
                return (
                  <li key={r.id} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          'h-2.5 w-2.5 shrink-0 rounded-full',
                          colorClasses(r.color).dot || 'bg-slate-300'
                        )}
                      />
                      <span className="truncate text-sm font-medium text-slate-800">
                        {r.full_name || 'Không tên'}
                      </span>
                      {r.phone && <span className="text-xs text-slate-400">{r.phone}</span>}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <label className="flex items-center gap-1.5 text-xs text-slate-500">
                        Giá 1 buổi
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          inputMode="numeric"
                          // Chưa đặt giá thì ô trống chứ không phải 0: 0 nghĩa
                          // là "dạy miễn phí", trống nghĩa là "chưa quyết"
                          value={goDo ? dang : hienTai}
                          placeholder="chưa đặt"
                          onChange={(e) => setDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && doi && luu(r)}
                          className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                        />
                        <span className="text-slate-400">₫</span>
                      </label>
                      {doi && (
                        <Button size="sm" icon={Check} loading={busy} onClick={() => luu(r)}>
                          Lưu
                        </Button>
                      )}

                      <span className="ml-auto flex items-center gap-3 text-xs">
                        <span className="text-slate-500">
                          Đã xong <b className="text-slate-800">{r.done_total}</b>/{r.session_total}
                        </span>
                        <span
                          className={clsx(
                            'rounded-lg px-2 py-0.5 font-semibold',
                            r.amount_total > 0
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-400'
                          )}
                        >
                          {formatMoney(r.amount_total)}
                        </span>
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-slate-600">
            <Wallet className="h-4 w-4 text-emerald-600" />
            {tong.done} buổi đã hoàn thành
          </span>
          <span className="text-base font-bold text-emerald-700">{formatMoney(tong.amount)}</span>
        </div>
      </div>
    </>
  )
}

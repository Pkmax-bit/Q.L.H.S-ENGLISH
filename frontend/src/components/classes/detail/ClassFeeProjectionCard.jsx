import { useCallback, useEffect, useContext, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import LoadingSpinner from '../../common/LoadingSpinner'
import tuitionService from '../../../services/tuition.service'
import { formatCurrency } from '../../../utils/formatCurrency'
import { formatDate } from '../../../utils/formatDate'
import { ToastContext } from '../../../context/ToastContext'

const POLICY_LABELS = {
  per_class: 'Trọn gói',
  monthly: 'Theo tháng',
  per_session: 'Theo buổi',
}

function fmtShortDate(iso) {
  if (!iso) return '—'
  return new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('vi-VN')
}

export default function ClassFeeProjectionCard({ classId, reloadKey = '' }) {
  const { error: showError } = useContext(ToastContext)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await tuitionService.getClassFeeProjection(classId)
    return res.data?.data ?? res.data
  }, [classId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load()
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((err) => {
        if (!cancelled) {
          showError(err.response?.data?.message || 'Không tải được thống kê học phí')
          setData(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [classId, reloadKey, load, showError])

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 min-h-[120px] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!data) return null

  const expectedCourse = Number(data.expected_total_course ?? data.expected_total) || 0
  const expectedToToday = Number(data.expected_total_to_today) || 0
  const collected = Number(data.collected_total) || 0
  const outstanding = Number(data.outstanding_total) || 0
  const gapCourse =
    data.gap_course_minus_collected != null
      ? Number(data.gap_course_minus_collected)
      : Number(data.gap_expected_minus_collected) || 0
  const gapToToday =
    data.gap_to_today_minus_collected != null
      ? Number(data.gap_to_today_minus_collected)
      : expectedToToday - collected

  const students = Array.isArray(data.students) ? data.students : []

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          Học phí lớp: dự kiến — đã thu — còn nợ
        </h3>
        <span className="text-xs text-gray-500">
          {data.fee_policy ? POLICY_LABELS[data.fee_policy] || data.fee_policy : 'Chưa cấu hình'}
        </span>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-gray-600 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
        <span>
          Kỳ <strong>cả khóa</strong> tính đến:{' '}
          <strong className="text-slate-800">{fmtShortDate(data.period_end_course)}</strong>
        </span>
        <span className="text-slate-300">|</span>
        <span>
          Kỳ <strong>lũy kế đến nay</strong>:{' '}
          <strong className="text-slate-800">{fmtShortDate(data.period_end_to_today)}</strong>
        </span>
      </div>

      <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
        {data.policy_hint}
        {data.projected_without_official_end && (
          <span className="block mt-1 text-amber-700">
            Lớp chưa có ngày kết thúc — phần “cả khóa” dùng cùng ngày cuối như “đến nay”.
          </span>
        )}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
        <Stat label="Sĩ số" value={String(data.enrolled_count)} />
        <Stat
          label="Dự kiến lũy kế đến nay"
          value={formatCurrency(expectedToToday)}
          highlight
          sub="Theo tháng/buổi: từ nhập học đến hôm nay (hoặc hết lớp nếu đã kết thúc)"
        />
        <Stat
          label="Dự kiến cả khóa"
          value={formatCurrency(expectedCourse)}
          sub={`Đến ${fmtShortDate(data.period_end_course)}`}
        />
        <Stat label="Tổng trên hóa đơn" value={formatCurrency(data.invoice_total)} />
        <Stat label="Đã thu (theo HĐ)" value={formatCurrency(collected)} green />
        <Stat label="Còn nợ (theo HĐ)" value={formatCurrency(outstanding)} rose />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-3">
          <div className="text-xs font-medium text-amber-900 mb-1">Chênh: dự kiến đến nay − đã thu</div>
          <div className="text-lg font-bold text-amber-900">
            {gapToToday <= 0 ? (
              <span className="text-emerald-700">
                {formatCurrency(Math.abs(gapToToday))} — đủ hoặc vượt so với lũy kế đến nay
              </span>
            ) : (
              <>Còn khoảng {formatCurrency(gapToToday)}</>
            )}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs font-medium text-slate-700 mb-1">Chênh: dự kiến cả khóa − đã thu</div>
          <div className="text-lg font-bold text-slate-800">
            {gapCourse <= 0 ? (
              <span className="text-emerald-700">
                {formatCurrency(Math.abs(gapCourse))} — đủ hoặc vượt so với cả khóa
              </span>
            ) : (
              <>Còn khoảng {formatCurrency(gapCourse)}</>
            )}
          </div>
        </div>
      </div>

      {students.length > 0 && (
        <div className="pt-2 border-t border-gray-100">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">Chi tiết theo học sinh</h4>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-2 py-2 font-medium min-w-[120px]">Học sinh</th>
                  <th className="text-left px-2 py-2 font-medium whitespace-nowrap">Nhập học</th>
                  <th className="text-center px-2 py-2 font-medium whitespace-nowrap">Tháng đến nay</th>
                  <th className="text-center px-2 py-2 font-medium whitespace-nowrap hidden md:table-cell">
                    Tháng cả khóa
                  </th>
                  <th className="text-right px-2 py-2 font-medium whitespace-nowrap">Dự kiến đến nay</th>
                  <th className="text-right px-2 py-2 font-medium whitespace-nowrap hidden lg:table-cell">
                    Dự kiến cả khóa
                  </th>
                  <th className="text-right px-2 py-2 font-medium whitespace-nowrap">Đã thu</th>
                  <th className="text-right px-2 py-2 font-medium whitespace-nowrap">Còn nợ</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.student_id} className="border-t border-gray-100 hover:bg-gray-50/80">
                    <td className="px-2 py-2 font-medium text-gray-800">{s.student_name || '—'}</td>
                    <td className="px-2 py-2 text-gray-600 whitespace-nowrap">
                      {formatDate(s.enrollment_date) || '—'}
                    </td>
                    <td className="px-2 py-2 text-center text-gray-700">
                      {s.months_to_today != null ? s.months_to_today : '—'}
                    </td>
                    <td className="px-2 py-2 text-center text-gray-600 hidden md:table-cell">
                      {s.months_full_course != null ? s.months_full_course : '—'}
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-emerald-800">
                      {formatCurrency(s.expected_to_today)}
                    </td>
                    <td className="px-2 py-2 text-right text-gray-700 hidden lg:table-cell">
                      {formatCurrency(s.expected_full_course)}
                    </td>
                    <td className="px-2 py-2 text-right text-emerald-700">{formatCurrency(s.paid_total)}</td>
                    <td className="px-2 py-2 text-right text-rose-700 font-medium">
                      {formatCurrency(s.balance_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            “Tháng” là số tháng lịch trong kỳ tính phí. Còn nợ lấy theo số dư các hóa đơn của học sinh trong
            lớp.
          </p>
        </div>
      )}

      {!data.fee_policy && (
        <p className="text-xs text-amber-700">
          Cấu hình học phí lớp để có con số dự kiến chính xác.
        </p>
      )}
    </div>
  )
}

function Stat({ label, value, accent, highlight, green, rose, sub }) {
  const cls = highlight
    ? 'border-emerald-200 bg-emerald-50/50'
    : accent
      ? 'border-gray-100 bg-white'
      : 'border-gray-100 bg-white'
  const valCls = green
    ? 'text-emerald-700'
    : rose
      ? 'text-rose-700'
      : highlight
        ? 'text-emerald-800'
        : 'text-gray-900'

  return (
    <div className={`rounded-lg border px-3 py-2.5 ${cls}`}>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className={`font-semibold ${valCls}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-500 mt-1 leading-snug">{sub}</div>}
    </div>
  )
}

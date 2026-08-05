import { useCallback, useEffect, useContext, useState } from 'react'
import { TrendingUp, CalendarDays } from 'lucide-react'
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
  const coll = data.collection_stats || {}
  const schedule = data.schedule_summary || {}
  const billingPeriods = Array.isArray(data.billing_periods) ? data.billing_periods : []

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

      {(schedule.total_sessions_course != null || data.start_date) && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-4 py-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
            <CalendarDays className="h-4 w-4" />
            Lịch học &amp; số buổi
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <ScheduleStat label="Thời gian lớp" value={`${fmtShortDate(data.start_date)} → ${fmtShortDate(data.end_date)}`} />
            <ScheduleStat label="Ca TKB" value={schedule.has_schedule ? `${schedule.schedule_count} ca, ${schedule.days_per_week} ngày/tuần` : 'Chưa có lịch'} />
            <ScheduleStat label="Tổng buổi (cả khóa)" value={schedule.total_sessions_course ?? '—'} highlight />
            <ScheduleStat label="Buổi đến nay" value={schedule.total_sessions_to_today ?? '—'} />
          </div>
          {!schedule.has_schedule && (
            <p className="text-[11px] text-amber-700">
              Thêm thời khóa biểu trong tab Lịch học để hệ thống tính số buổi và học phí theo buổi chính xác.
            </p>
          )}
        </div>
      )}

      {billingPeriods.length > 0 && (
        <div className="pt-1">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">Lịch trình đóng học phí theo kỳ</h4>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-2 py-2 font-medium min-w-[100px]">Kỳ</th>
                  <th className="text-center px-2 py-2 font-medium whitespace-nowrap">Buổi</th>
                  <th className="text-right px-2 py-2 font-medium whitespace-nowrap">Dự kiến</th>
                  <th className="text-right px-2 py-2 font-medium whitespace-nowrap">Trên HĐ</th>
                  <th className="text-right px-2 py-2 font-medium whitespace-nowrap">Đã thu</th>
                  <th className="text-right px-2 py-2 font-medium whitespace-nowrap">Còn nợ</th>
                  <th className="text-center px-2 py-2 font-medium whitespace-nowrap">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {billingPeriods.map((p) => (
                  <tr key={p.year_month || p.label} className="border-t border-gray-100 hover:bg-gray-50/80">
                    <td className="px-2 py-2 font-medium text-gray-800 whitespace-nowrap">
                      {p.label}
                      <div className="text-[10px] text-gray-400 font-normal">
                        {fmtShortDate(p.period_start)} — {fmtShortDate(p.period_end)}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center text-gray-700">{p.session_count ?? '—'}</td>
                    <td className="px-2 py-2 text-right text-emerald-800">{formatCurrency(p.expected_total)}</td>
                    <td className="px-2 py-2 text-right text-gray-700">{formatCurrency(p.invoiced_total)}</td>
                    <td className="px-2 py-2 text-right text-emerald-700">{formatCurrency(p.paid_total)}</td>
                    <td className="px-2 py-2 text-right text-rose-700 font-medium">{formatCurrency(p.balance_total)}</td>
                    <td className="px-2 py-2 text-center">
                      <BillingStatusPill status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-gray-200 font-semibold text-gray-800">
                <tr>
                  <td className="px-2 py-2">Tổng</td>
                  <td className="px-2 py-2 text-center">
                    {billingPeriods.reduce((s, p) => s + (p.session_count || 0), 0)}
                  </td>
                  <td className="px-2 py-2 text-right">{formatCurrency(billingPeriods.reduce((s, p) => s + p.expected_total, 0))}</td>
                  <td className="px-2 py-2 text-right">{formatCurrency(billingPeriods.reduce((s, p) => s + p.invoiced_total, 0))}</td>
                  <td className="px-2 py-2 text-right text-emerald-700">{formatCurrency(billingPeriods.reduce((s, p) => s + p.paid_total, 0))}</td>
                  <td className="px-2 py-2 text-right text-rose-700">{formatCurrency(billingPeriods.reduce((s, p) => s + p.balance_total, 0))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            Dự kiến tính theo chính sách phí và lịch TKB; Đã thu / Còn nợ lấy từ hóa đơn thực tế trong từng kỳ.
          </p>
        </div>
      )}

      {(coll.paid_count != null || data.enrolled_count > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
          <StudentCountStat label="Sĩ số" value={data.enrolled_count} />
          <StudentCountStat label="Đã đóng đủ" value={coll.paid_count ?? 0} tone="emerald" />
          <StudentCountStat label="Đóng thiếu" value={coll.partial_count ?? 0} tone="amber" />
          <StudentCountStat label="Chưa đóng" value={coll.unpaid_count ?? 0} tone="rose" />
          <StudentCountStat label="Chưa có HĐ" value={coll.no_invoice_count ?? 0} tone="gray" />
          <StudentCountStat label="Đã thu" value={formatCurrency(collected)} tone="emerald" money />
          <StudentCountStat label="Còn nợ" value={formatCurrency(outstanding)} tone="rose" money />
        </div>
      )}

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
                  <th className="text-center px-2 py-2 font-medium whitespace-nowrap">Trạng thái</th>
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
                    <td className="px-2 py-2 text-center">
                      <PaymentStatusPill status={s.payment_status} />
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

function StudentCountStat({ label, value, tone = 'slate', money = false }) {
  const colors = {
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    rose: 'text-rose-700',
    gray: 'text-slate-600',
    slate: 'text-gray-900',
  }
  return (
    <div className="rounded-lg border border-gray-200 bg-slate-50 px-2.5 py-2">
      <div className="text-[10px] text-gray-500">{label}</div>
      <div className={`${money ? 'text-xs' : 'text-base'} font-bold ${colors[tone]}`}>{value}</div>
    </div>
  )
}

function PaymentStatusPill({ status }) {
  const map = {
    paid: 'bg-emerald-100 text-emerald-800',
    partial: 'bg-amber-100 text-amber-800',
    unpaid: 'bg-rose-100 text-rose-800',
    no_invoice: 'bg-gray-100 text-gray-600',
  }
  const labels = {
    paid: 'Đã đóng',
    partial: 'Thiếu',
    unpaid: 'Chưa đóng',
    no_invoice: 'Chưa HĐ',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${map[status] || map.no_invoice}`}>
      {labels[status] || '—'}
    </span>
  )
}

function BillingStatusPill({ status }) {
  const map = {
    paid: 'bg-emerald-100 text-emerald-800',
    partial: 'bg-amber-100 text-amber-800',
    unpaid: 'bg-rose-100 text-rose-800',
    no_invoice: 'bg-slate-100 text-slate-600',
    none: 'bg-gray-100 text-gray-500',
  }
  const labels = {
    paid: 'Đủ',
    partial: 'Thiếu',
    unpaid: 'Chưa thu',
    no_invoice: 'Chưa HĐ',
    none: '—',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${map[status] || map.none}`}>
      {labels[status] || '—'}
    </span>
  )
}

function ScheduleStat({ label, value, highlight }) {
  return (
    <div>
      <div className="text-gray-500">{label}</div>
      <div className={`font-semibold ${highlight ? 'text-indigo-800' : 'text-gray-800'}`}>{value}</div>
    </div>
  )
}

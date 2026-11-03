import { useCallback, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2, Circle, CalendarDays, DollarSign, Users, FileText,
  ChevronDown, ChevronUp, Receipt, Wallet, Edit2, Save,
} from 'lucide-react'
import LoadingSpinner from '../../common/LoadingSpinner'
import Button from '../../common/Button'
import Select from '../../common/Select'
import Input from '../../common/Input'
import GenerateInvoicesModal from '../../tuition/GenerateInvoicesModal'
import { ToastContext } from '../../../context/ToastContext'
import { AuthContext } from '../../../context/AuthContext'
import tuitionService from '../../../services/tuition.service'
import classesService from '../../../services/classes.service'
import { formatCurrency } from '../../../utils/formatCurrency'
import { formatDate } from '../../../utils/formatDate'

const POLICY_LABELS = {
  per_class: 'Trọn gói',
  monthly: 'Theo tháng',
  per_session: 'Theo buổi',
}

const POLICY_OPTIONS = [
  { value: 'monthly', label: 'Theo tháng — đóng cố định mỗi tháng' },
  { value: 'per_session', label: 'Theo buổi — tính theo số buổi học thực tế' },
  { value: 'per_class', label: 'Trọn gói — một lần cho cả khóa' },
]

function fmtShortDate(iso) {
  if (!iso) return '—'
  return new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('vi-VN')
}

export default function ClassTuitionPanel({ classInfo, studentCount = 0, onUpdated }) {
  const navigate = useNavigate()
  const { user } = useContext(AuthContext) || {}
  const { success, error: showError } = useContext(ToastContext)
  const isAdmin = user?.role === 'admin'

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showStudents, setShowStudents] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [editingFee, setEditingFee] = useState(false)
  const [savingFee, setSavingFee] = useState(false)
  const [feeForm, setFeeForm] = useState({
    fee_policy: '',
    fee_amount: 0,
    billing_day: 1,
    sessions_per_period: 0,
  })

  const reloadKey = `${classInfo?.fee_policy}-${classInfo?.fee_amount}-${classInfo?.start_date}-${classInfo?.end_date}-${studentCount}`

  const load = useCallback(async () => {
    const res = await tuitionService.getClassFeeProjection(classInfo.id)
    return res.data?.data ?? res.data
  }, [classInfo.id])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load()
      .then((d) => { if (!cancelled) setData(d) })
      .catch((err) => {
        if (!cancelled) {
          showError(err.response?.data?.message || 'Không tải được học phí lớp')
          setData(null)
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [classInfo.id, reloadKey, load, showError])

  useEffect(() => {
    setFeeForm({
      fee_policy: classInfo.fee_policy || '',
      fee_amount: classInfo.fee_amount || 0,
      billing_day: classInfo.billing_day || 1,
      sessions_per_period: classInfo.sessions_per_period || 0,
    })
  }, [classInfo])

  const handleSaveFee = async () => {
    setSavingFee(true)
    try {
      await classesService.update(classInfo.id, {
        fee_policy: feeForm.fee_policy || null,
        fee_amount: Number(feeForm.fee_amount) || 0,
        billing_day: Number(feeForm.billing_day) || 1,
        sessions_per_period: Number(feeForm.sessions_per_period) || 0,
      })
      success('Đã lưu cấu hình học phí')
      setEditingFee(false)
      onUpdated?.()
    } catch (err) {
      showError(err.response?.data?.message || 'Lưu thất bại')
    } finally {
      setSavingFee(false)
    }
  }

  const refresh = () => {
    load().then(setData).catch(() => {})
    onUpdated?.()
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 flex justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!data) return null

  const summary = data.simple_summary || {}
  const schedule = data.schedule_summary || {}
  const checklist = data.setup_checklist || []
  const periods = data.billing_periods || []
  const students = data.students || []
  const requiredSteps = checklist.filter((s) => !s.optional)
  const doneCount = requiredSteps.filter((s) => s.done).length
  const requiredTotal = requiredSteps.length || checklist.length
  const hasInvoices = !!(data.has_invoices || (summary.invoice_count ?? data.invoice_count) > 0)
  const openFeeEditor = () => {
    if (!isAdmin) return
    setEditingFee(true)
    requestAnimationFrame(() => {
      document.getElementById('class-fee-config')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const expectedSub = (() => {
    if (data.fee_policy === 'monthly') {
      const n = summary.student_count ?? data.enrolled_count ?? 0
      return n > 0 ? `Dự kiến · ${n} HS × đơn giá tháng` : 'Dự kiến theo đơn giá tháng'
    }
    if (data.fee_policy === 'per_session') {
      return `${schedule.total_sessions_course ?? 0} buổi học (dự kiến)`
    }
    if (data.fee_policy === 'per_class') {
      return 'Dự kiến trọn gói cả khóa'
    }
    return 'Cấu hình phí để xem dự kiến'
  })()

  const debtSub = !hasInvoices
    ? 'Chưa có hóa đơn — chưa tính công nợ'
    : `${(data.collection_stats?.unpaid_count ?? 0) + (data.collection_stats?.partial_count ?? 0)} HS chưa đủ`

  return (
    <div className="space-y-5">
      {/* Hướng dẫn 4 bước */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Thiết lập học phí</h3>
          <span className="text-xs text-gray-500">{doneCount}/{requiredTotal} bước bắt buộc xong</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {checklist.map((step) => (
            <SetupStep
              key={step.key}
              step={step}
              classId={classInfo.id}
              navigate={navigate}
              onOpenFee={openFeeEditor}
            />
          ))}
        </div>
        {!data.setup_complete && (
          <p className="text-xs text-amber-700 mt-3 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
            Hoàn thành các bước bắt buộc để thu học phí. Bước lịch học chỉ bắt buộc khi tính theo buổi.
          </p>
        )}
        {data.setup_complete && !hasInvoices && isAdmin && (
          <p className="text-xs text-indigo-700 mt-3 bg-indigo-50 rounded-lg px-3 py-2 border border-indigo-100">
            Đã sẵn sàng: bấm <strong>Sinh hóa đơn</strong> bên dưới rồi mới <strong>Thu tiền</strong>.
          </p>
        )}
      </div>

      {/* 3 con số chính */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Phải thu cả khóa (dự kiến)"
          value={formatCurrency(summary.expected_course ?? data.expected_total_course)}
          sub={expectedSub}
          tone="slate"
        />
        <SummaryCard
          label="Đã thu (theo hóa đơn)"
          value={formatCurrency(summary.collected ?? data.collected_total)}
          sub={
            hasInvoices
              ? `${data.collection_stats?.paid_count ?? 0} HS đóng đủ`
              : 'Chưa có hóa đơn'
          }
          tone="emerald"
        />
        <SummaryCard
          label="Còn nợ (theo hóa đơn)"
          value={hasInvoices ? formatCurrency(summary.outstanding ?? data.outstanding_total) : '—'}
          sub={debtSub}
          tone="rose"
        />
      </div>
      <p className="text-[11px] text-gray-500 -mt-2">
        Dự kiến = theo lịch &amp; giá lớp · Đã thu / Còn nợ = chỉ tính sau khi đã sinh hóa đơn.
      </p>

      {/* Cấu hình học phí */}
      <div id="class-fee-config" className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            Cách tính phí
          </h3>
          {isAdmin && !editingFee && (
            <Button variant="ghost" size="sm" icon={Edit2} data-tour="tuition-fee-edit" onClick={openFeeEditor}>
              Sửa
            </Button>
          )}
        </div>

        {!editingFee ? (
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <InfoChip label="Hình thức" value={POLICY_LABELS[data.fee_policy] || 'Chưa cấu hình'} />
            <InfoChip label="Đơn giá" value={formatCurrency(data.fee_amount)} />
            {data.fee_policy === 'monthly' && (
              <InfoChip label="Hạn đóng phí" value={`Ngày ${data.billing_day || 1} hàng tháng`} />
            )}
            {schedule.has_schedule && (
              <InfoChip
                label="Lịch học"
                value={`${schedule.schedule_count} ca · ${schedule.days_per_week} ngày/tuần · ${schedule.total_sessions_course} buổi`}
              />
            )}
          </div>
        ) : (
          <div className="space-y-3 max-w-lg">
            <Select
              label="Hình thức tính phí"
              value={feeForm.fee_policy}
              onChange={(e) => setFeeForm((f) => ({ ...f, fee_policy: e.target.value }))}
              options={POLICY_OPTIONS}
              placeholder="Chọn hình thức"
              dataTour="tuition-fee-policy"
            />
            <Input
              label={feeForm.fee_policy === 'per_session' ? 'Giá mỗi buổi (VNĐ)' : 'Giá (VNĐ)'}
              type="number"
              min={0}
              value={feeForm.fee_amount}
              onChange={(e) => setFeeForm((f) => ({ ...f, fee_amount: e.target.value }))}
              dataTour="tuition-fee-amount"
            />
            {feeForm.fee_policy === 'monthly' && (
              <Input
                label="Ngày hạn đóng phí hàng tháng (1–28)"
                type="number"
                min={1}
                max={28}
                value={feeForm.billing_day}
                onChange={(e) => setFeeForm((f) => ({ ...f, billing_day: e.target.value }))}
                helperText="Nếu ngày này đã qua trong tháng, hóa đơn mới sẽ hạn đến cuối tháng"
              />
            )}
            {feeForm.fee_policy === 'per_session' && !schedule.has_schedule && (
              <Input
                label="Số buổi / tháng (dùng khi chưa có lịch học)"
                type="number"
                min={0}
                value={feeForm.sessions_per_period}
                onChange={(e) => setFeeForm((f) => ({ ...f, sessions_per_period: e.target.value }))}
              />
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setEditingFee(false)} disabled={savingFee}>
                Hủy
              </Button>
              <Button size="sm" icon={Save} data-tour="tuition-fee-save" onClick={handleSaveFee} loading={savingFee}>
                Lưu
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Lịch đóng phí */}
      {(periods.length > 0 || (isAdmin && data.fee_policy)) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-indigo-600" />
              Lịch đóng học phí
            </h3>
            {isAdmin && data.fee_policy && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" icon={Receipt} data-tour="tuition-generate" onClick={() => setShowGenerate(true)}>
                  Sinh hóa đơn
                </Button>
                <Button
                  size="sm"
                  icon={Wallet}
                  data-tour="tuition-collect"
                  onClick={() =>
                    navigate(`/finances?tab=tuition_payment&class_id=${classInfo.id}`)
                  }
                >
                  Thu tiền
                </Button>
              </div>
            )}
          </div>

          {periods.length === 0 ? (
            <p className="text-sm text-gray-500">
              Chưa có kỳ thu dự kiến. Kiểm tra ngày bắt đầu / kết thúc lớp rồi sinh hóa đơn cho tháng cần thu.
            </p>
          ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Kỳ</th>
                  <th className="text-center px-2 py-2 font-medium">Buổi</th>
                  <th className="text-right px-2 py-2 font-medium">Phải thu</th>
                  <th className="text-right px-2 py-2 font-medium">Đã thu</th>
                  <th className="text-right px-2 py-2 font-medium">Còn nợ</th>
                  <th className="text-center px-2 py-2 font-medium">TT</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.year_month || p.label} className="border-t border-gray-100">
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-gray-800">{p.label}</div>
                      <div className="text-[10px] text-gray-400">
                        {fmtShortDate(p.period_start)} — {fmtShortDate(p.period_end)}
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-center text-gray-600">{p.session_count || '—'}</td>
                    <td className="px-2 py-2.5 text-right text-gray-800">{formatCurrency(p.expected_total)}</td>
                    <td className="px-2 py-2.5 text-right text-emerald-700">{formatCurrency(p.paid_total)}</td>
                    <td className="px-2 py-2.5 text-right font-medium text-rose-700">{formatCurrency(p.balance_total)}</td>
                    <td className="px-2 py-2.5 text-center">
                      <StatusPill status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
          <p className="text-[11px] text-gray-500 mt-2">
            Phải thu theo kỳ = dự kiến · Đã thu / Còn nợ = theo hóa đơn đã sinh
          </p>
        </div>
      )}

      {/* Chi tiết học sinh — thu gọn */}
      {students.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowStudents((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              Chi tiết từng học sinh ({students.length})
            </span>
            {showStudents ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showStudents && (
            <div className="border-t border-gray-100 overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Học sinh</th>
                    <th className="text-left px-2 py-2 font-medium">Nhập học</th>
                    <th className="text-right px-2 py-2 font-medium">Phải thu</th>
                    <th className="text-right px-2 py-2 font-medium">Đã thu</th>
                    <th className="text-right px-2 py-2 font-medium">Còn nợ</th>
                    <th className="text-center px-2 py-2 font-medium">TT</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.student_id} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium">{s.student_name || '—'}</td>
                      <td className="px-2 py-2 text-gray-600">{formatDate(s.enrollment_date) || '—'}</td>
                      <td className="px-2 py-2 text-right">{formatCurrency(s.expected_full_course)}</td>
                      <td className="px-2 py-2 text-right text-emerald-700">{formatCurrency(s.paid_total)}</td>
                      <td className="px-2 py-2 text-right text-rose-700 font-medium">{formatCurrency(s.balance_total)}</td>
                      <td className="px-2 py-2 text-center">
                        <StatusPill status={s.payment_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <GenerateInvoicesModal
        isOpen={showGenerate}
        onClose={() => setShowGenerate(false)}
        classes={[classInfo]}
        defaultClassId={classInfo.id}
        onSuccess={() => {
          setShowGenerate(false)
          refresh()
        }}
      />
    </div>
  )
}

function SetupStep({ step, classId, navigate, onOpenFee }) {
  const icons = {
    dates: CalendarDays,
    schedule: CalendarDays,
    fee: DollarSign,
    students: Users,
  }
  const Icon = icons[step.key] || FileText
  const canClick =
    step.key === 'fee' ||
    (!step.done && (step.key === 'schedule' || step.key === 'students'))

  const handleClick = () => {
    if (step.key === 'fee') {
      onOpenFee?.()
      return
    }
    if (step.done) return
    if (step.key === 'schedule') navigate(`/schedules?class_id=${classId}`)
    else if (step.key === 'students') navigate(`/classes/${classId}?tab=students`)
  }

  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        step.done
          ? step.optional
            ? 'border-emerald-100 bg-emerald-50/30'
            : 'border-emerald-200 bg-emerald-50/50'
          : canClick
            ? 'border-gray-200 bg-gray-50 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30'
            : 'border-gray-200 bg-gray-50'
      } ${step.done && step.key === 'fee' ? 'cursor-pointer hover:border-emerald-300' : ''}`}
      onClick={canClick ? handleClick : undefined}
      role={canClick ? 'button' : undefined}
    >
      <div className="flex items-start gap-2">
        {step.done ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        ) : (
          <Circle className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
        )}
        <div>
          <div className="font-medium text-gray-800">
            {step.step}. {step.label}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{step.hint}</div>
        </div>
        <Icon className="h-4 w-4 text-gray-300 ml-auto shrink-0" />
      </div>
    </div>
  )
}

function SummaryCard({ label, value, sub, tone }) {
  const tones = {
    slate: 'border-slate-200 bg-slate-50',
    emerald: 'border-emerald-200 bg-emerald-50/60',
    rose: 'border-rose-200 bg-rose-50/60',
  }
  const valColors = {
    slate: 'text-slate-900',
    emerald: 'text-emerald-800',
    rose: 'text-rose-800',
  }
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${valColors[tone]}`}>{value}</div>
      {sub && <div className="text-[11px] text-gray-500 mt-1">{sub}</div>}
    </div>
  )
}

function InfoChip({ label, value }) {
  return (
    <div>
      <span className="text-gray-500">{label}: </span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  )
}

function StatusPill({ status }) {
  const map = {
    paid: { cls: 'bg-emerald-100 text-emerald-800', label: 'Đủ' },
    partial: { cls: 'bg-amber-100 text-amber-800', label: 'Thiếu' },
    unpaid: { cls: 'bg-rose-100 text-rose-800', label: 'Chưa thu' },
    no_invoice: { cls: 'bg-slate-100 text-slate-600', label: 'Chưa có hóa đơn' },
    none: { cls: 'bg-gray-100 text-gray-500', label: '—' },
  }
  const s = map[status] || map.none
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${s.cls}`}>
      {s.label}
    </span>
  )
}
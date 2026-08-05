import { useState, useEffect, useCallback, useContext } from 'react'
import { DollarSign, RefreshCw, User } from 'lucide-react'
import Button from '../common/Button'
import Input from '../common/Input'
import Select from '../common/Select'
import Modal from '../common/Modal'
import LoadingSpinner from '../common/LoadingSpinner'
import EmptyState from '../common/EmptyState'
import { ToastContext } from '../../context/ToastContext'
import teacherPayrollService from '../../services/teacherPayroll.service'
import teachersService from '../../services/teachers.service'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDate } from '../../utils/formatDate'

export default function TeacherPayrollPanel() {
  const { success, error: showError } = useContext(ToastContext)
  const [teachers, setTeachers] = useState([])
  const [teacherId, setTeacherId] = useState('')
  const [from, setFrom] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [payTarget, setPayTarget] = useState(null)
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'cash', note: '' })
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    teachersService.getAll({ limit: 200 }).then((res) => {
      const list = res.data?.data || res.data || []
      setTeachers(Array.isArray(list) ? list : list?.data || [])
    }).catch(() => {})
  }, [])

  const loadSummary = useCallback(async () => {
    if (!teacherId) {
      setSummary(null)
      return
    }
    setLoading(true)
    try {
      const res = await teacherPayrollService.getTeacherSummary(teacherId, { from, to })
      setSummary(res.data?.data || res.data)
    } catch (err) {
      showError(err.response?.data?.message || 'Không tải được dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [teacherId, from, to, showError])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await teacherPayrollService.generateEntries({
        teacher_id: teacherId || undefined,
        from,
        to,
      })
      const r = res.data?.data || res.data
      success(`Tạo ${r.created} khoản chi (${r.skipped} bỏ qua)`)
      loadSummary()
    } catch (err) {
      showError(err.response?.data?.message || 'Tạo khoản chi thất bại')
    } finally {
      setGenerating(false)
    }
  }

  const openPay = (entry) => {
    setPayTarget(entry)
    setPayForm({
      amount: entry.amount,
      payment_method: 'cash',
      note: '',
    })
  }

  const handlePay = async () => {
    if (!payTarget) return
    setPaying(true)
    try {
      await teacherPayrollService.payEntry(payTarget.id, {
        amount: Number(payForm.amount),
        payment_method: payForm.payment_method,
        note: payForm.note,
      })
      success('Đã ghi chi trả giáo viên vào sổ thu chi')
      setPayTarget(null)
      loadSummary()
    } catch (err) {
      showError(err.response?.data?.message || 'Thanh toán thất bại')
    } finally {
      setPaying(false)
    }
  }

  const teacherOptions = teachers.map((t) => ({
    value: t.id,
    label: t.full_name || t.email,
  }))

  const pendingEntries = (summary?.entries || []).filter((e) => e.status === 'pending')

  return (
    <div className="space-y-4">
      <div className="app-card p-4">
        <p className="text-sm text-stone-600 mb-3">
          Chọn giáo viên để xem chi phí theo lớp hoặc theo buổi (từ điểm danh). Cấu hình mức lương tại từng lớp → Tổng quan.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select
            label="Giáo viên"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            options={teacherOptions}
            placeholder="Chọn giáo viên..."
          />
          <Input label="Từ ngày" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="Đến ngày" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <div className="flex items-end gap-2">
            <Button variant="outline" icon={RefreshCw} loading={generating} onClick={handleGenerate}>
              Tính khoản chi
            </Button>
          </div>
        </div>
      </div>

      {!teacherId ? (
        <EmptyState message="Chọn giáo viên để xem chi phí trả theo lớp / buổi" icon={User} />
      ) : loading ? (
        <LoadingSpinner />
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Chờ chi" value={formatCurrency(summary.summary.pending_total)} color="text-rose-600" />
            <Stat label="Đã chi" value={formatCurrency(summary.summary.paid_total)} color="text-emerald-600" />
            <Stat label="Buổi đã học" value={summary.summary.completed_sessions} />
            <Stat label="Khoản chờ TT" value={summary.summary.pending_entries} />
          </div>

          <div className="app-card p-4">
            <h3 className="text-sm font-semibold text-stone-800 mb-3">Theo lớp</h3>
            <div className="space-y-2">
              {(summary.classes || []).map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-stone-100 last:border-0"
                >
                  <div>
                    <div className="font-medium text-stone-900">{c.name}</div>
                    <div className="text-xs text-stone-500">
                      {c.teacher_pay_policy === 'per_session'
                        ? `Theo buổi: ${formatCurrency(c.teacher_pay_amount)}/buổi`
                        : c.teacher_pay_policy === 'per_class'
                          ? `Theo lớp: ${formatCurrency(c.teacher_pay_amount)}/kỳ`
                          : 'Chưa cấu hình lương'}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <span className="text-rose-600 font-medium">{formatCurrency(c.pending)}</span>
                    <span className="text-stone-400 mx-1">/</span>
                    <span className="text-emerald-600">{formatCurrency(c.paid)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {pendingEntries.length === 0 ? (
            <EmptyState message="Không có khoản chi chờ thanh toán trong kỳ này" />
          ) : (
            <div className="app-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 text-left text-stone-600">
                    <th className="px-4 py-2">Mô tả</th>
                    <th className="px-4 py-2">Lớp</th>
                    <th className="px-4 py-2">Kỳ / buổi</th>
                    <th className="px-4 py-2 text-right">Số tiền</th>
                    <th className="px-4 py-2 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingEntries.map((e) => (
                    <tr key={e.id} className="border-t border-stone-100">
                      <td className="px-4 py-2">{e.description}</td>
                      <td className="px-4 py-2">{e.class_name}</td>
                      <td className="px-4 py-2 text-xs text-stone-500">
                        {e.session_date
                          ? formatDate(e.session_date)
                          : `${formatDate(e.period_start)} → ${formatDate(e.period_end)}`}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-rose-600">
                        {formatCurrency(e.amount)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button size="sm" icon={DollarSign} onClick={() => openPay(e)}>
                          Chi trả
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}

      <Modal
        isOpen={!!payTarget}
        onClose={() => setPayTarget(null)}
        title="Chi trả giáo viên"
      >
        {payTarget && (
          <div className="space-y-3">
            <p className="text-sm text-stone-600">{payTarget.description}</p>
            <Input
              label="Số tiền"
              type="number"
              value={payForm.amount}
              onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
            />
            <Select
              label="Hình thức"
              value={payForm.payment_method}
              onChange={(e) => setPayForm((f) => ({ ...f, payment_method: e.target.value }))}
              options={[
                { value: 'cash', label: 'Tiền mặt' },
                { value: 'transfer', label: 'Chuyển khoản' },
              ]}
            />
            <Input
              label="Ghi chú"
              value={payForm.note}
              onChange={(e) => setPayForm((f) => ({ ...f, note: e.target.value }))}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPayTarget(null)}>
                Hủy
              </Button>
              <Button loading={paying} onClick={handlePay}>
                Ghi chi + hoàn tất
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function Stat({ label, value, color = 'text-stone-900' }) {
  return (
    <div className="app-card p-3">
      <div className="text-xs text-stone-500">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  )
}

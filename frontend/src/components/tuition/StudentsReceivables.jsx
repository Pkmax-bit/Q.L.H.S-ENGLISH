import { useState, useEffect, useCallback, useContext, useMemo } from 'react'
import { Search, DollarSign, AlertTriangle } from 'lucide-react'
import Input from '../common/Input'
import Select from '../common/Select'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import EmptyState from '../common/EmptyState'
import StudentTuitionLedger from './StudentTuitionLedger'
import RecordPaymentForm from './RecordPaymentForm'
import InvoiceDetailModal from './InvoiceDetailModal'
import { ToastContext } from '../../context/ToastContext'
import tuitionService from '../../services/tuition.service'
import classesService from '../../services/classes.service'
import { formatDate } from '../../utils/formatDate'
import { formatCurrency } from '../../utils/formatCurrency'

/** Danh sách học sinh còn nợ học phí + thu tiền nhanh. */
export default function StudentsReceivables() {
  const { error: showError } = useContext(ToastContext)
  const [filters, setFilters] = useState({ search: '', class_id: '', overdue_only: false })
  const [classes, setClasses] = useState([])
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState({
    student_count: 0,
    open_invoices: 0,
    total_outstanding: 0,
    total_overdue: 0,
  })
  const [loading, setLoading] = useState(true)

  const [selectedStudent, setSelectedStudent] = useState(null)
  const [ledger, setLedger] = useState(null)
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [payTarget, setPayTarget] = useState(null)
  const [detailId, setDetailId] = useState(null)

  useEffect(() => {
    classesService
      .getAll({ limit: 200 })
      .then((res) => {
        const list = res.data?.data || res.data || []
        setClasses(Array.isArray(list) ? list : list?.data || [])
      })
      .catch(() => {})
  }, [])

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.search.trim()) params.search = filters.search.trim()
      if (filters.class_id) params.class_id = filters.class_id
      if (filters.overdue_only) params.overdue_only = true
      const res = await tuitionService.getStudentsReceivables(params)
      const payload = res.data?.data || res.data
      setRows(payload?.rows || [])
      setSummary(
        payload?.summary || {
          student_count: 0,
          open_invoices: 0,
          total_outstanding: 0,
          total_overdue: 0,
        }
      )
    } catch (err) {
      showError(err.response?.data?.message || 'Không tải được danh sách công nợ')
    } finally {
      setLoading(false)
    }
  }, [filters, showError])

  useEffect(() => {
    const t = setTimeout(loadList, filters.search ? 350 : 0)
    return () => clearTimeout(t)
  }, [loadList, filters.search])

  const classOptions = useMemo(
    () => classes.map((c) => ({ value: c.id, label: c.name })),
    [classes]
  )

  const loadLedger = useCallback(
    async (studentId) => {
      setLedgerLoading(true)
      try {
        const res = await tuitionService.getStudentLedger(studentId)
        setLedger(res.data?.data || res.data)
      } catch (err) {
        showError(err.response?.data?.message || 'Không tải được sổ học phí')
      } finally {
        setLedgerLoading(false)
      }
    },
    [showError]
  )

  const selectStudent = (row) => {
    const student = {
      id: row.student_id,
      full_name: row.student_name,
      email: row.email,
      phone: row.phone,
    }
    setSelectedStudent(student)
    loadLedger(row.student_id)
    setTimeout(() => {
      document.getElementById('student-tuition-ledger')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const handlePaySuccess = () => {
    setPayTarget(null)
    loadList()
    if (selectedStudent) loadLedger(selectedStudent.id)
  }

  return (
    <div className="space-y-4">
      <div className="app-card p-4">
        <p className="text-sm text-stone-600 mb-3">
          Xem học sinh còn nợ học phí bao nhiêu và thu tiền nhanh từng hóa đơn.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-9 h-4 w-4 text-stone-400" />
            <Input
              label="Tìm học sinh"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Tên, email, số điện thoại..."
              className="pl-9"
            />
          </div>
          <Select
            label="Lớp"
            value={filters.class_id}
            onChange={(e) => setFilters((f) => ({ ...f, class_id: e.target.value }))}
            options={classOptions}
            placeholder="Tất cả lớp"
          />
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.overdue_only}
                onChange={(e) => setFilters((f) => ({ ...f, overdue_only: e.target.checked }))}
                className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
              />
              Chỉ nợ quá hạn
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Học sinh nợ" value={summary.student_count} />
        <SummaryCard label="Hóa đơn chưa thu" value={summary.open_invoices} />
        <SummaryCard
          label="Tổng còn nợ"
          value={formatCurrency(summary.total_outstanding)}
          color="text-rose-600"
        />
        <SummaryCard
          label="Nợ quá hạn"
          value={formatCurrency(summary.total_overdue)}
          color="text-red-700"
          icon={summary.total_overdue > 0 ? AlertTriangle : null}
        />
      </div>

      {loading ? (
        <LoadingSpinner message="Đang tải danh sách công nợ..." />
      ) : rows.length === 0 ? (
        <EmptyState message="Không có học sinh nợ học phí phù hợp bộ lọc" />
      ) : (
        <div className="overflow-x-auto app-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/80 text-left text-stone-600">
                <th className="px-4 py-3 font-medium">Học sinh</th>
                <th className="px-4 py-3 font-medium">Lớp</th>
                <th className="px-4 py-3 font-medium text-center">Số HĐ</th>
                <th className="px-4 py-3 font-medium">Hạn sớm nhất</th>
                <th className="px-4 py-3 font-medium text-right">Còn nợ học phí</th>
                <th className="px-4 py-3 font-medium text-right">Quá hạn</th>
                <th className="px-4 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.student_id}
                  className={`border-b border-stone-50 hover:bg-amber-50/30 ${
                    selectedStudent?.id === r.student_id ? 'bg-amber-50/60' : ''
                  } ${r.has_overdue ? 'bg-red-50/20' : ''}`}
                >
                  <td className="px-4 py-2">
                    <div className="font-medium text-stone-900">{r.student_name}</div>
                    <div className="text-xs text-stone-500">
                      {r.phone || r.email || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-stone-700 max-w-[180px] truncate" title={r.classes}>
                    {r.classes || '—'}
                  </td>
                  <td className="px-4 py-2 text-center">{r.open_invoices}</td>
                  <td className="px-4 py-2 text-xs">
                    {formatDate(r.oldest_due_date) || '—'}
                    {r.has_overdue && (
                      <span className="ml-1 text-red-600 font-medium">(quá hạn)</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-rose-600 text-base">
                    {formatCurrency(r.total_outstanding)}
                  </td>
                  <td className="px-4 py-2 text-right text-red-700">
                    {r.overdue_outstanding > 0 ? formatCurrency(r.overdue_outstanding) : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" icon={DollarSign} onClick={() => selectStudent(r)}>
                      Thu tiền
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div id="student-tuition-ledger">
        <StudentTuitionLedger
          student={selectedStudent}
          ledger={ledger}
          loading={ledgerLoading}
          onPay={setPayTarget}
          onViewInvoice={setDetailId}
          onClearStudent={() => {
            setSelectedStudent(null)
            setLedger(null)
          }}
        />
      </div>

      {payTarget && (
        <RecordPaymentForm
          isOpen={!!payTarget}
          invoice={payTarget}
          onClose={() => setPayTarget(null)}
          onSuccess={handlePaySuccess}
        />
      )}

      {detailId && (
        <InvoiceDetailModal
          invoiceId={detailId}
          isOpen={!!detailId}
          onClose={() => setDetailId(null)}
          onChanged={() => {
            loadList()
            if (selectedStudent) loadLedger(selectedStudent.id)
          }}
        />
      )}
    </div>
  )
}

function SummaryCard({ label, value, color = 'text-stone-900', icon: Icon }) {
  return (
    <div className="app-card p-3">
      <div className="text-xs text-stone-500 mb-0.5 flex items-center gap-1">
        {Icon && <Icon className="h-3.5 w-3.5 text-red-500" />}
        {label}
      </div>
      <div className={`text-base font-semibold ${color}`}>{value}</div>
    </div>
  )
}

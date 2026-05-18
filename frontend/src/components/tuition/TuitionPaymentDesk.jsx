import { useState, useEffect, useContext, useCallback } from 'react'
import { Search, DollarSign } from 'lucide-react'
import Input from '../common/Input'
import Button from '../common/Button'
import StatusBadge from '../common/StatusBadge'
import LoadingSpinner from '../common/LoadingSpinner'
import EmptyState from '../common/EmptyState'
import InvoiceDetailModal from './InvoiceDetailModal'
import RecordPaymentForm from './RecordPaymentForm'
import { ToastContext } from '../../context/ToastContext'
import studentsService from '../../services/students.service'
import tuitionService from '../../services/tuition.service'
import { formatDate } from '../../utils/formatDate'
import { formatCurrency } from '../../utils/formatCurrency'

export default function TuitionPaymentDesk() {
  const { error: showError } = useContext(ToastContext)
  const [search, setSearch] = useState('')
  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [ledger, setLedger] = useState(null)
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [payTarget, setPayTarget] = useState(null)
  const [detailId, setDetailId] = useState(null)

  // Search students with debounce
  useEffect(() => {
    if (!search.trim()) {
      setStudents([])
      return
    }
    const t = setTimeout(async () => {
      setStudentsLoading(true)
      try {
        const res = await studentsService.getAll({ search, limit: 10 })
        const list = res.data?.data || res.data || []
        setStudents(Array.isArray(list) ? list : list?.data || [])
      } catch (err) {
        showError(err.response?.data?.message || 'Tìm học sinh thất bại')
      } finally {
        setStudentsLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [search, showError])

  const loadLedger = useCallback(async (studentId) => {
    setLedgerLoading(true)
    try {
      const res = await tuitionService.getStudentLedger(studentId)
      setLedger(res.data?.data || res.data)
    } catch (err) {
      showError(err.response?.data?.message || 'Không tải được sổ học phí')
    } finally {
      setLedgerLoading(false)
    }
  }, [showError])

  const selectStudent = (s) => {
    setSelectedStudent(s)
    setSearch('')
    setStudents([])
    loadLedger(s.id)
  }

  const handlePaySuccess = () => {
    setPayTarget(null)
    if (selectedStudent) loadLedger(selectedStudent.id)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tìm học sinh để thu học phí
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nhập tên, email hoặc số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {(studentsLoading || students.length > 0) && (
          <div className="mt-2 border border-gray-200 rounded-lg max-h-64 overflow-y-auto bg-white">
            {studentsLoading && <div className="p-3 text-sm text-gray-500">Đang tìm...</div>}
            {!studentsLoading && students.length === 0 && search && (
              <div className="p-3 text-sm text-gray-500">Không tìm thấy</div>
            )}
            {students.map((s) => (
              <button
                key={s.id}
                onClick={() => selectStudent(s)}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between border-b border-gray-100 last:border-b-0"
              >
                <div>
                  <div className="font-medium text-gray-900">{s.full_name}</div>
                  <div className="text-xs text-gray-500">
                    {s.email} {s.phone ? `• ${s.phone}` : ''}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedStudent && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-lg font-semibold">{selectedStudent.full_name}</div>
              <div className="text-xs text-gray-500">
                {selectedStudent.email} {selectedStudent.phone ? `• ${selectedStudent.phone}` : ''}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setSelectedStudent(null); setLedger(null) }}>
              Đổi học sinh
            </Button>
          </div>

          {ledgerLoading ? (
            <LoadingSpinner />
          ) : ledger ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <Stat label="Số HĐ" value={ledger.summary.invoice_count} />
                <Stat label="Tổng phải thu" value={formatCurrency(ledger.summary.total_amount)} />
                <Stat label="Đã thu" value={formatCurrency(ledger.summary.total_paid)} color="text-emerald-600" />
                <Stat
                  label="Còn nợ"
                  value={formatCurrency(ledger.summary.total_outstanding)}
                  color={ledger.summary.total_outstanding > 0 ? 'text-rose-600' : 'text-gray-500'}
                />
              </div>

              {(ledger.invoices || []).length === 0 ? (
                <EmptyState message="Học sinh chưa có hóa đơn nào" />
              ) : (
                <div className="space-y-2">
                  {ledger.invoices.map((inv) => {
                    const canPay = inv.status !== 'paid' && inv.status !== 'cancelled' && Number(inv.balance) > 0
                    return (
                      <div
                        key={inv.id}
                        className="border border-gray-200 rounded-lg p-3 flex items-center gap-3 hover:bg-gray-50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-gray-500">{inv.invoice_no}</span>
                            <StatusBadge status={inv.status} />
                            <span className="text-sm text-gray-700">{inv.class_name}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Kỳ: {formatDate(inv.period_start)} → {formatDate(inv.period_end)}
                            {inv.due_date ? ` • Hạn: ${formatDate(inv.due_date)}` : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Còn lại</div>
                          <div className={`font-bold ${canPay ? 'text-rose-600' : 'text-gray-400'}`}>
                            {formatCurrency(inv.balance)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setDetailId(inv.id)}>
                            Xem
                          </Button>
                          {canPay && (
                            <Button size="sm" icon={DollarSign} onClick={() => setPayTarget(inv)}>
                              Thu tiền
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

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
          onChanged={() => selectedStudent && loadLedger(selectedStudent.id)}
        />
      )}
    </div>
  )
}

function Stat({ label, value, color = 'text-gray-900' }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className={`text-base font-semibold ${color}`}>{value}</div>
    </div>
  )
}

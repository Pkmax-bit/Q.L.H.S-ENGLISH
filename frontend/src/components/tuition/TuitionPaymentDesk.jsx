import { useState, useEffect, useContext, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, DollarSign, AlertTriangle } from 'lucide-react'
import StudentTuitionLedger from './StudentTuitionLedger'
import InvoiceDetailModal from './InvoiceDetailModal'
import RecordPaymentForm from './RecordPaymentForm'
import LoadingSpinner from '../common/LoadingSpinner'
import { ToastContext } from '../../context/ToastContext'
import studentsService from '../../services/students.service'
import tuitionService from '../../services/tuition.service'
import classesService from '../../services/classes.service'
import { formatCurrency } from '../../utils/formatCurrency'

export default function TuitionPaymentDesk() {
  const { error: showError } = useContext(ToastContext)
  const [searchParams] = useSearchParams()
  const classIdFromUrl = searchParams.get('class_id') || ''

  const [search, setSearch] = useState('')
  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [debtors, setDebtors] = useState([])
  const [debtorsLoading, setDebtorsLoading] = useState(true)
  const [debtorsError, setDebtorsError] = useState(null)
  const [classFilter, setClassFilter] = useState(classIdFromUrl)
  const [className, setClassName] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [ledger, setLedger] = useState(null)
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [payTarget, setPayTarget] = useState(null)
  const [detailId, setDetailId] = useState(null)

  useEffect(() => {
    setClassFilter(classIdFromUrl)
  }, [classIdFromUrl])

  useEffect(() => {
    if (!classFilter) {
      setClassName('')
      return
    }
    classesService
      .getById(classFilter)
      .then((res) => {
        const c = res.data?.data || res.data
        setClassName(c?.name || '')
      })
      .catch(() => setClassName(''))
  }, [classFilter])

  const loadDebtors = useCallback(async () => {
    setDebtorsLoading(true)
    setDebtorsError(null)
    try {
      const params = {}
      if (classFilter) params.class_id = classFilter
      const res = await tuitionService.getStudentsReceivables(params)
      const payload = res.data?.data || res.data
      setDebtors(payload?.rows || [])
    } catch (err) {
      setDebtors([])
      setDebtorsError(err.response?.data?.message || 'Không tải được danh sách học sinh nợ')
    } finally {
      setDebtorsLoading(false)
    }
  }, [classFilter])

  useEffect(() => {
    loadDebtors()
  }, [loadDebtors])

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

  const selectStudent = (s) => {
    setSelectedStudent(s)
    setSearch('')
    setStudents([])
    loadLedger(s.id)
  }

  const selectDebtor = (row) => {
    selectStudent({
      id: row.student_id,
      full_name: row.student_name,
      email: row.email,
      phone: row.phone,
    })
  }

  const handlePaySuccess = () => {
    setPayTarget(null)
    loadDebtors()
    if (selectedStudent) loadLedger(selectedStudent.id)
  }

  return (
    <div className="space-y-4">
      {className && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Đang thu học phí lớp <strong>{className}</strong>
          {' · '}
          <button
            type="button"
            className="underline font-medium"
            onClick={() => setClassFilter('')}
          >
            Xem tất cả lớp
          </button>
        </div>
      )}

      <div className="app-card p-4">
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Tìm học sinh để thu học phí
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="Nhập tên, email hoặc số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {(studentsLoading || students.length > 0) && (
          <div className="mt-2 border border-stone-200 rounded-lg max-h-64 overflow-y-auto bg-white">
            {studentsLoading && <div className="p-3 text-sm text-stone-500">Đang tìm...</div>}
            {!studentsLoading && students.length === 0 && search && (
              <div className="p-3 text-sm text-stone-500">Không tìm thấy</div>
            )}
            {students.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectStudent(s)}
                className="w-full text-left px-3 py-2 hover:bg-amber-50 flex items-center justify-between border-b border-stone-100 last:border-b-0"
              >
                <div>
                  <div className="font-medium text-stone-900">{s.full_name}</div>
                  <div className="text-xs text-stone-500">
                    {s.email} {s.phone ? `• ${s.phone}` : ''}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {!search.trim() && (
        <div className="app-card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-stone-800">Học sinh đang nợ học phí</h3>
            {debtors.some((d) => d.has_overdue) && (
              <span className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Có nợ quá hạn
              </span>
            )}
          </div>
          {debtorsLoading ? (
            <LoadingSpinner message="Đang tải..." />
          ) : debtorsError ? (
            <p className="text-sm text-rose-600 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              {debtorsError}
            </p>
          ) : debtors.length === 0 ? (
            <div className="text-sm text-stone-500 space-y-1">
              <p>Không có học sinh nợ học phí{className ? ' trong lớp này' : ''}.</p>
              <p className="text-xs">
                Nếu vừa cấu hình phí: vào lớp → tab Học phí → <strong>Sinh hóa đơn</strong> trước khi thu tiền.
              </p>
            </div>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {debtors.map((d) => (
                <button
                  key={d.student_id}
                  type="button"
                  onClick={() => selectDebtor(d)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 flex items-center justify-between gap-2 border border-transparent hover:border-amber-100"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-stone-900 truncate">{d.student_name}</div>
                    <div className="text-xs text-stone-500 truncate">{d.classes || d.phone || d.email}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-stone-500">Còn nợ</div>
                    <div className="font-bold text-rose-600">{formatCurrency(d.total_outstanding)}</div>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-amber-700 flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    Thu
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
            loadDebtors()
            if (selectedStudent) loadLedger(selectedStudent.id)
          }}
        />
      )}
    </div>
  )
}

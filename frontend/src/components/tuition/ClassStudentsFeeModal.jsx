import { useState, useEffect, useCallback, useContext } from 'react'
import { DollarSign, FileText, AlertTriangle, Plus, Edit2, Trash2, Users } from 'lucide-react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import StatusBadge from '../common/StatusBadge'
import LoadingSpinner from '../common/LoadingSpinner'
import EmptyState from '../common/EmptyState'
import ConfirmDialog from '../common/ConfirmDialog'
import ClassStudentManager from '../classes/ClassStudentManager'
import RecordPaymentForm from './RecordPaymentForm'
import InvoiceDetailModal from './InvoiceDetailModal'
import InvoiceForm from './InvoiceForm'
import { ToastContext } from '../../context/ToastContext'
import tuitionService from '../../services/tuition.service'
import classesService from '../../services/classes.service'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDate } from '../../utils/formatDate'

export default function ClassStudentsFeeModal({ isOpen, classInfo, yearMonth, onClose, onChanged }) {
  const { success, error: showError } = useContext(ToastContext)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | unpaid | paid | no_invoice
  const [payInvoice, setPayInvoice] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [createFor, setCreateFor] = useState(null) // { student_id, student_name }
  const [editInvoice, setEditInvoice] = useState(null) // invoice
  const [deleteInvoice, setDeleteInvoice] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [studentsList, setStudentsList] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)

  const loadStudentsForClass = useCallback(async () => {
    if (!classInfo?.id) return
    setLoadingStudents(true)
    try {
      const res = await classesService.getStudents(classInfo.id)
      const list = res.data?.data ?? res.data
      setStudentsList(Array.isArray(list) ? list : [])
    } catch (err) {
      showError(err.response?.data?.message || 'Không tải được danh sách học sinh lớp')
      setStudentsList([])
    } finally {
      setLoadingStudents(false)
    }
  }, [classInfo?.id, showError])

  const load = useCallback(async () => {
    if (!classInfo) return
    setLoading(true)
    try {
      const res = await tuitionService.getClassStudents(classInfo.id, {
        year_month: yearMonth || undefined,
      })
      const list = res.data?.data || res.data || []
      setRows(Array.isArray(list) ? list : [])
    } catch (err) {
      showError(err.response?.data?.message || 'Không tải được danh sách')
    } finally {
      setLoading(false)
    }
  }, [classInfo, yearMonth, showError])

  useEffect(() => {
    if (isOpen) {
      load()
      loadStudentsForClass()
    }
  }, [isOpen, load, loadStudentsForClass])

  const handleStudentsChanged = () => {
    loadStudentsForClass()
    load()
    onChanged?.()
  }

  const filtered = rows.filter((r) => {
    if (filter === 'all') return true
    if (filter === 'unpaid') return r.status === 'unpaid' || r.status === 'partial'
    if (filter === 'paid') return r.status === 'paid'
    if (filter === 'no_invoice') return r.status === 'no_invoice'
    return true
  })

  const counts = rows.reduce((acc, r) => {
    acc.all += 1
    if (r.status === 'paid') acc.paid += 1
    if (r.status === 'unpaid' || r.status === 'partial') acc.unpaid += 1
    if (r.status === 'no_invoice') acc.no_invoice += 1
    return acc
  }, { all: 0, paid: 0, unpaid: 0, no_invoice: 0 })

  const handlePaid = () => {
    setPayInvoice(null)
    load()
    onChanged?.()
  }

  const handleInvoiceSaved = () => {
    setCreateFor(null)
    setEditInvoice(null)
    load()
    onChanged?.()
  }

  const confirmDelete = async () => {
    if (!deleteInvoice) return
    setDeleting(true)
    try {
      await tuitionService.deleteInvoice(deleteInvoice.id)
      success('Đã xóa hóa đơn')
      setDeleteInvoice(null)
      load()
      onChanged?.()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa thất bại')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${classInfo?.name || ''} • ${yearMonth || 'Tất cả kỳ'}`}
      size="3xl"
    >
      <div className="mb-5 pb-5 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-blue-600" />
          <h4 className="text-base font-semibold text-gray-900">Học sinh trong lớp</h4>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Thêm / xóa học sinh (ghi danh). Sau khi đổi danh sách, bảng thu học phí bên dưới sẽ cập nhật.
        </p>
        <ClassStudentManager
          classId={classInfo.id}
          students={studentsList}
          loading={loadingStudents}
          onReload={handleStudentsChanged}
          readOnly={false}
        />
      </div>

      <h4 className="text-base font-semibold text-gray-900 mb-2">Thu học phí & hóa đơn</h4>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
              Tất cả ({counts.all})
            </FilterChip>
            <FilterChip
              active={filter === 'unpaid'}
              onClick={() => setFilter('unpaid')}
              tone="rose"
            >
              Chưa đóng ({counts.unpaid})
            </FilterChip>
            <FilterChip
              active={filter === 'paid'}
              onClick={() => setFilter('paid')}
              tone="emerald"
            >
              Đã đóng ({counts.paid})
            </FilterChip>
            <FilterChip
              active={filter === 'no_invoice'}
              onClick={() => setFilter('no_invoice')}
              tone="gray"
            >
              Chưa có HĐ ({counts.no_invoice})
            </FilterChip>
          </div>

          {filtered.length === 0 ? (
            <EmptyState message="Không có học sinh phù hợp" />
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => (
                <StudentRow
                  key={r.student_id}
                  row={r}
                  onPay={(inv) =>
                    setPayInvoice({
                      ...inv,
                      student_name: r.student_name,
                      student_phone: r.student_phone,
                      class_name: classInfo.name,
                    })
                  }
                  onView={(invId) => setDetailId(invId)}
                  onCreate={() => setCreateFor({ student_id: r.student_id, student_name: r.student_name })}
                  onEdit={(inv) => setEditInvoice(inv)}
                  onDelete={(inv) => setDeleteInvoice({ ...inv, student_name: r.student_name })}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {payInvoice && (
        <RecordPaymentForm
          isOpen={!!payInvoice}
          invoice={payInvoice}
          onClose={() => setPayInvoice(null)}
          onSuccess={handlePaid}
        />
      )}

      {detailId && (
        <InvoiceDetailModal
          invoiceId={detailId}
          isOpen={!!detailId}
          onClose={() => setDetailId(null)}
          onChanged={load}
        />
      )}

      {createFor && (
        <InvoiceForm
          isOpen={!!createFor}
          mode="create"
          studentId={createFor.student_id}
          studentName={createFor.student_name}
          classId={classInfo.id}
          className={classInfo.name}
          feePolicy={classInfo.fee_policy}
          feeAmount={classInfo.fee_amount}
          defaultYearMonth={yearMonth}
          onClose={() => setCreateFor(null)}
          onSuccess={handleInvoiceSaved}
        />
      )}

      {editInvoice && (
        <InvoiceForm
          isOpen={!!editInvoice}
          mode="edit"
          invoiceId={editInvoice.id}
          studentName={editInvoice.student_name}
          className={classInfo.name}
          onClose={() => setEditInvoice(null)}
          onSuccess={handleInvoiceSaved}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteInvoice}
        onClose={() => setDeleteInvoice(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Xóa hóa đơn"
        message={
          deleteInvoice
            ? `Xóa hóa đơn ${deleteInvoice.invoice_no || ''} của ${deleteInvoice.student_name || 'học sinh'}? Các khoản thu liên quan và dòng tiền tương ứng sẽ bị xóa theo.`
            : ''
        }
      />
    </Modal>
  )
}

function FilterChip({ active, onClick, tone = 'blue', children }) {
  const tones = {
    blue: active ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    rose: active ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100',
    emerald: active ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    gray: active ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  }
  return (
    <button
      type="button"
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${tones[tone]}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function StudentRow({ row, onPay, onView, onCreate, onEdit, onDelete }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="font-medium text-gray-900">{row.student_name}</div>
          <div className="text-xs text-gray-500">
            {row.student_email} {row.student_phone ? `• ${row.student_phone}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-gray-500">Còn nợ</div>
            <div className={`font-semibold ${row.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {formatCurrency(row.balance)}
            </div>
          </div>
          <RowBadge status={row.status} />
          <Button size="sm" variant="outline" icon={Plus} onClick={onCreate}>
            Tạo HĐ
          </Button>
        </div>
      </div>

      {row.invoices && row.invoices.length > 0 ? (
        <div className="mt-2 space-y-1">
          {row.invoices.map((inv) => {
            const canPay = Number(inv.balance) > 0 && inv.status !== 'paid'
            const today = new Date().toISOString().slice(0, 10)
            const isOverdue = canPay && inv.due_date && inv.due_date < today
            const hasPayments = Number(inv.paid_amount) > 0
            return (
              <div
                key={inv.id}
                className={`flex items-center justify-between text-sm rounded p-2 border ${
                  isOverdue ? 'border-red-200 bg-red-50/40' : 'border-gray-100 bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="font-mono text-xs text-gray-500">{inv.invoice_no}</span>
                  <span className="text-xs text-gray-600">
                    {formatDate(inv.period_start)} → {formatDate(inv.period_end)}
                  </span>
                  {isOverdue && (
                    <span className="text-xs text-red-600 inline-flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Quá hạn {formatDate(inv.due_date)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-sm mr-2 ${canPay ? 'text-rose-600 font-semibold' : 'text-gray-500'}`}>
                    {formatCurrency(inv.balance)}
                  </span>
                  <button
                    className="p-1 rounded hover:bg-blue-100 text-blue-600"
                    title="Xem chi tiết"
                    onClick={() => onView(inv.id)}
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                  <button
                    className="p-1 rounded hover:bg-amber-100 text-amber-600"
                    title="Sửa hóa đơn"
                    onClick={() => onEdit(inv)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    className="p-1 rounded hover:bg-red-100 text-red-600"
                    title={hasPayments ? 'Xóa hóa đơn (sẽ xóa cả các khoản thu liên quan)' : 'Xóa hóa đơn'}
                    onClick={() => onDelete(inv)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {canPay && (
                    <Button size="sm" icon={DollarSign} onClick={() => onPay(inv)}>
                      Đóng
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="mt-2 text-xs text-gray-400 italic">Chưa có hóa đơn cho kỳ này</div>
      )}
    </div>
  )
}

function RowBadge({ status }) {
  if (status === 'paid') return <StatusBadge status="paid" />
  if (status === 'partial') return <StatusBadge status="partial" />
  if (status === 'unpaid') return <StatusBadge status="unpaid" />
  return (
    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
      Chưa có HĐ
    </span>
  )
}

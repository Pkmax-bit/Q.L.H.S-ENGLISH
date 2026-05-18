import { useState, useContext, useCallback, useMemo, useEffect } from 'react'
import { Plus, FileText, Filter, Sparkles } from 'lucide-react'
import Table from '../common/Table'
import Button from '../common/Button'
import Select from '../common/Select'
import Input from '../common/Input'
import StatusBadge from '../common/StatusBadge'
import ConfirmDialog from '../common/ConfirmDialog'
import InvoiceDetailModal from './InvoiceDetailModal'
import GenerateInvoicesModal from './GenerateInvoicesModal'
import { useFetch } from '../../hooks/useFetch'
import { ToastContext } from '../../context/ToastContext'
import { AuthContext } from '../../context/AuthContext'
import tuitionService from '../../services/tuition.service'
import classesService from '../../services/classes.service'
import { formatDate } from '../../utils/formatDate'
import { formatCurrency } from '../../utils/formatCurrency'

export default function TuitionInvoiceList() {
  const { user } = useContext(AuthContext) || {}
  const { success, error: showError } = useContext(ToastContext)

  const [filters, setFilters] = useState({ class_id: '', status: '', period_start: '', period_end: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [showDelete, setShowDelete] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const isAdmin = user?.role === 'admin'

  const fetchInvoices = useCallback(
    () => tuitionService.getInvoices({ limit: 100, ...stripEmpty(filters) }),
    [filters]
  )
  const { data, loading, execute: reload } = useFetch(fetchInvoices, [filters])

  const invoices = Array.isArray(data) ? data : data?.data || data?.invoices || []

  const [classes, setClasses] = useState([])
  useEffect(() => {
    classesService.getAll({ limit: 200 })
      .then((res) => {
        const list = res.data?.data || res.data || []
        setClasses(Array.isArray(list) ? list : list?.data || [])
      })
      .catch(() => {})
  }, [])

  const classOptions = useMemo(
    () => classes.map((c) => ({ value: c.id, label: c.name })),
    [classes]
  )

  const columns = [
    { key: 'invoice_no', label: 'Số HĐ', accessor: (r) => r.invoice_no || '—' },
    { key: 'student_name', label: 'Học sinh', accessor: (r) => r.student_name || '—' },
    { key: 'class_name', label: 'Lớp', accessor: (r) => r.class_name || '—' },
    {
      key: 'period_start',
      label: 'Kỳ',
      accessor: (r) => `${formatDate(r.period_start)} → ${formatDate(r.period_end)}`,
    },
    { key: 'due_date', label: 'Hạn TT', accessor: (r) => formatDate(r.due_date) || '—' },
    {
      key: 'total',
      label: 'Tổng tiền',
      render: (r) => <span className="font-medium">{formatCurrency(r.total)}</span>,
    },
    {
      key: 'paid_amount',
      label: 'Đã thu',
      render: (r) => <span className="text-emerald-600">{formatCurrency(r.paid_amount)}</span>,
    },
    {
      key: 'balance',
      label: 'Còn lại',
      render: (r) => (
        <span className={r.balance > 0 ? 'text-rose-600 font-semibold' : 'text-gray-400'}>
          {formatCurrency(r.balance)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (r) => <StatusBadge status={r.status} />,
    },
  ]

  const handleDelete = (item) => {
    setPendingDelete(item)
    setShowDelete(true)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await tuitionService.deleteInvoice(pendingDelete.id)
      success('Đã xóa hóa đơn')
      reload()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa thất bại')
    } finally {
      setDeleting(false)
      setShowDelete(false)
      setPendingDelete(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            icon={Filter}
            onClick={() => setShowFilters((v) => !v)}
          >
            Bộ lọc
          </Button>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" icon={Sparkles} onClick={() => setShowGenerate(true)}>
              Sinh hóa đơn
            </Button>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select
              label="Lớp"
              value={filters.class_id}
              onChange={(e) => setFilters((f) => ({ ...f, class_id: e.target.value }))}
              options={classOptions}
              placeholder="Tất cả"
            />
            <Select
              label="Trạng thái"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              options={[
                { value: 'unpaid', label: 'Chưa thu' },
                { value: 'partial', label: 'Thu một phần' },
                { value: 'paid', label: 'Đã thu đủ' },
                { value: 'overdue', label: 'Quá hạn' },
                { value: 'cancelled', label: 'Đã hủy' },
              ]}
              placeholder="Tất cả"
            />
            <Input
              label="Từ kỳ"
              type="date"
              value={filters.period_start}
              onChange={(e) => setFilters((f) => ({ ...f, period_start: e.target.value }))}
            />
            <Input
              label="Đến kỳ"
              type="date"
              value={filters.period_end}
              onChange={(e) => setFilters((f) => ({ ...f, period_end: e.target.value }))}
            />
          </div>
          <div className="text-right mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({ class_id: '', status: '', period_start: '', period_end: '' })}
            >
              Xóa bộ lọc
            </Button>
          </div>
        </div>
      )}

      <Table
        columns={columns}
        data={invoices}
        loading={loading}
        onView={(r) => setSelectedId(r.id)}
        onDelete={isAdmin ? handleDelete : undefined}
        searchPlaceholder="Tìm số hóa đơn, học sinh, lớp..."
        emptyMessage="Chưa có hóa đơn nào"
        emptyIcon={FileText}
      />

      {selectedId && (
        <InvoiceDetailModal
          invoiceId={selectedId}
          isOpen={!!selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => reload()}
        />
      )}

      {showGenerate && (
        <GenerateInvoicesModal
          isOpen={showGenerate}
          onClose={() => setShowGenerate(false)}
          classes={classes}
          onSuccess={() => {
            setShowGenerate(false)
            reload()
          }}
        />
      )}

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => {
          setShowDelete(false)
          setPendingDelete(null)
        }}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Xóa hóa đơn"
        message={`Xóa hóa đơn ${pendingDelete?.invoice_no || ''}? Các thanh toán liên quan sẽ bị xóa theo.`}
      />
    </div>
  )
}

function stripEmpty(obj) {
  const out = {}
  for (const k in obj) if (obj[k]) out[k] = obj[k]
  return out
}

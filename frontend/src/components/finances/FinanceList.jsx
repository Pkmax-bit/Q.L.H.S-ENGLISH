import { useState, useContext, useCallback } from 'react'
import { Plus, Download, Filter } from 'lucide-react'
import Table from '../common/Table'
import Button from '../common/Button'
import StatusBadge from '../common/StatusBadge'
import Select from '../common/Select'
import Input from '../common/Input'
import ConfirmDialog from '../common/ConfirmDialog'
import FinanceForm from './FinanceForm'
import { useFetch } from '../../hooks/useFetch'
import { useExcelExport } from '../../hooks/useExcelExport'
import { ToastContext } from '../../context/ToastContext'
import financesService from '../../services/finances.service'
import { formatDate } from '../../utils/formatDate'
import { formatCurrency } from '../../utils/formatCurrency'

export default function FinanceList() {
  const [showForm, setShowForm] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ type: '', categoryId: '', dateFrom: '', dateTo: '' })
  const { success, error: showError } = useContext(ToastContext)
  const { exportToExcel } = useExcelExport()

  const fetchFinances = useCallback(() => financesService.getAll(), [])
  const { data: finances, loading, execute: reload } = useFetch(fetchFinances)

  const fetchCategories = useCallback(() => financesService.getCategories(), [])
  const { data: categoriesData } = useFetch(fetchCategories)
  const categories = Array.isArray(categoriesData) ? categoriesData : categoriesData?.categories || []

  const financeList = Array.isArray(finances) ? finances : finances?.finances || []

  // Apply filters
  const filteredList = financeList.filter((item) => {
    if (filters.type && item.type !== filters.type) return false
    if (filters.categoryId) {
      const catId = item.categoryId || item.category?._id || item.category?.id
      if (catId !== filters.categoryId) return false
    }
    if (filters.dateFrom) {
      const itemDate = new Date(item.payment_date || item.paymentDate || item.createdAt)
      if (itemDate < new Date(filters.dateFrom)) return false
    }
    if (filters.dateTo) {
      const itemDate = new Date(item.payment_date || item.paymentDate || item.createdAt)
      if (itemDate > new Date(filters.dateTo + 'T23:59:59')) return false
    }
    return true
  })

  const categoryOptions = categories.map((c) => ({ value: c._id || c.id, label: c.name }))

  const paymentMethodMap = {
    cash: 'Tiền mặt',
    bank_transfer: 'Chuyển khoản',
    card: 'Thẻ',
    other: 'Khác',
  }

  const columns = [
    {
      key: 'payment_date',
      label: 'Ngày',
      accessor: (row) => formatDate(row.payment_date || row.paymentDate || row.createdAt),
    },
    {
      key: 'type',
      label: 'Loại',
      render: (row) => <StatusBadge status={row.type || 'income'} />,
    },
    {
      key: 'category',
      label: 'Danh mục',
      accessor: (row) => row.category?.name || row.categoryName || '—',
    },
    {
      key: 'amount',
      label: 'Số tiền',
      render: (row) => (
        <span className={`font-medium ${row.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
          {row.type === 'income' ? '+' : '-'}{formatCurrency(row.amount)}
        </span>
      ),
    },
    { key: 'description', label: 'Mô tả' },
    {
      key: 'payment_method',
      label: 'Phương thức',
      accessor: (row) => paymentMethodMap[row.payment_method || row.paymentMethod] || row.payment_method || '—',
    },
  ]

  const handleEdit = (item) => { setSelected(item); setShowForm(true) }
  const handleDelete = (item) => { setSelected(item); setShowDelete(true) }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await financesService.delete(selected._id || selected.id)
      success('Xóa giao dịch thành công')
      reload()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa giao dịch thất bại')
    } finally {
      setDeleting(false)
      setShowDelete(false)
      setSelected(null)
    }
  }

  const handleExport = () => {
    const exportCols = [
      { key: 'payment_date', header: 'Ngày', accessor: (r) => formatDate(r.payment_date || r.paymentDate) },
      { key: 'type', header: 'Loại' },
      { key: 'category', header: 'Danh mục', accessor: (r) => r.category?.name || '' },
      { key: 'amount', header: 'Số tiền' },
      { key: 'description', header: 'Mô tả' },
      { key: 'payment_method', header: 'Phương thức' },
    ]
    exportToExcel(filteredList, exportCols, 'danh-sach-tai-chinh')
  }

  const clearFilters = () => setFilters({ type: '', categoryId: '', dateFrom: '', dateTo: '' })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <Button variant="outline" icon={Download} onClick={handleExport}>
            Xuất Excel
          </Button>
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            icon={Filter}
            onClick={() => setShowFilters(!showFilters)}
          >
            Bộ lọc
          </Button>
        </div>
        <Button icon={Plus} onClick={() => { setSelected(null); setShowForm(true) }}>
          Thêm giao dịch
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select
              label="Loại"
              value={filters.type}
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
              options={[
                { value: 'income', label: 'Thu' },
                { value: 'expense', label: 'Chi' },
              ]}
              placeholder="Tất cả"
            />
            <Select
              label="Danh mục"
              value={filters.categoryId}
              onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}
              options={categoryOptions}
              placeholder="Tất cả"
            />
            <Input
              label="Từ ngày"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            />
            <Input
              label="Đến ngày"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
            />
          </div>
          <div className="mt-3 text-right">
            <Button variant="ghost" size="sm" onClick={clearFilters}>Xóa bộ lọc</Button>
          </div>
        </div>
      )}

      <Table
        columns={columns}
        data={filteredList}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Tìm giao dịch..."
        emptyMessage="Chưa có giao dịch nào"
      />

      <FinanceForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setSelected(null) }}
        finance={selected}
        categories={categories}
        onSuccess={() => { setShowForm(false); setSelected(null); reload() }}
      />

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => { setShowDelete(false); setSelected(null) }}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Xóa giao dịch"
        message={`Bạn có chắc chắn muốn xóa giao dịch này?`}
      />
    </div>
  )
}

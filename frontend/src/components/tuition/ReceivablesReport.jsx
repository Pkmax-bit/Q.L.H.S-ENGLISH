import { useState, useEffect, useCallback, useContext, useMemo } from 'react'
import { Download, AlertTriangle } from 'lucide-react'
import Button from '../common/Button'
import Select from '../common/Select'
import Input from '../common/Input'
import StatusBadge from '../common/StatusBadge'
import LoadingSpinner from '../common/LoadingSpinner'
import EmptyState from '../common/EmptyState'
import { useFetch } from '../../hooks/useFetch'
import { useExcelExport } from '../../hooks/useExcelExport'
import { ToastContext } from '../../context/ToastContext'
import tuitionService from '../../services/tuition.service'
import classesService from '../../services/classes.service'
import { formatDate } from '../../utils/formatDate'
import { formatCurrency } from '../../utils/formatCurrency'

export default function ReceivablesReport() {
  const { error: showError } = useContext(ToastContext)
  const { exportToExcel } = useExcelExport()
  const [filters, setFilters] = useState({ class_id: '', period_start: '', period_end: '' })
  const [classes, setClasses] = useState([])

  useEffect(() => {
    classesService.getAll({ limit: 200 }).then((res) => {
      const list = res.data?.data || res.data || []
      setClasses(Array.isArray(list) ? list : list?.data || [])
    }).catch(() => {})
  }, [])

  const fetchData = useCallback(
    () => tuitionService.getReceivables(stripEmpty(filters)),
    [filters]
  )
  const { data, loading } = useFetch(fetchData, [filters])

  const summary = data?.summary || { invoice_count: 0, total_amount: 0, total_paid: 0, total_outstanding: 0, total_overdue: 0 }
  const rows = data?.rows || []

  const classOptions = useMemo(
    () => classes.map((c) => ({ value: c.id, label: c.name })),
    [classes]
  )

  const handleExport = () => {
    if (!rows.length) return
    const cols = [
      { key: 'invoice_no', header: 'Số HĐ' },
      { key: 'student_name', header: 'Học sinh' },
      { key: 'class_name', header: 'Lớp' },
      { key: 'period_start', header: 'Từ ngày', accessor: (r) => formatDate(r.period_start) },
      { key: 'period_end', header: 'Đến ngày', accessor: (r) => formatDate(r.period_end) },
      { key: 'due_date', header: 'Hạn TT', accessor: (r) => formatDate(r.due_date) || '' },
      { key: 'total', header: 'Tổng' },
      { key: 'paid_amount', header: 'Đã thu' },
      { key: 'balance', header: 'Còn lại' },
      { key: 'status', header: 'Trạng thái' },
    ]
    exportToExcel(rows, cols, 'cong-no-hoc-phi')
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select
            label="Lớp"
            value={filters.class_id}
            onChange={(e) => setFilters((f) => ({ ...f, class_id: e.target.value }))}
            options={classOptions}
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
          <div className="flex items-end">
            <Button variant="outline" icon={Download} onClick={handleExport} disabled={!rows.length}>
              Xuất Excel
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryCard label="Số hóa đơn" value={summary.invoice_count} />
        <SummaryCard label="Tổng phải thu" value={formatCurrency(summary.total_amount)} />
        <SummaryCard label="Đã thu" value={formatCurrency(summary.total_paid)} color="text-emerald-600" />
        <SummaryCard label="Còn nợ" value={formatCurrency(summary.total_outstanding)} color="text-rose-600" />
        <SummaryCard
          label="Nợ quá hạn"
          value={formatCurrency(summary.total_overdue)}
          color="text-red-700"
          icon={summary.total_overdue > 0 ? AlertTriangle : null}
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : rows.length === 0 ? (
        <EmptyState message="Không có công nợ phù hợp" />
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-left text-gray-600">
                <th className="px-4 py-3 font-medium">Số HĐ</th>
                <th className="px-4 py-3 font-medium">Học sinh</th>
                <th className="px-4 py-3 font-medium">Lớp</th>
                <th className="px-4 py-3 font-medium">Kỳ</th>
                <th className="px-4 py-3 font-medium">Hạn TT</th>
                <th className="px-4 py-3 font-medium text-right">Tổng</th>
                <th className="px-4 py-3 font-medium text-right">Đã thu</th>
                <th className="px-4 py-3 font-medium text-right">Còn lại</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={`border-b border-gray-50 ${r.is_overdue ? 'bg-red-50/30' : ''}`}>
                  <td className="px-4 py-2 font-mono text-xs">{r.invoice_no}</td>
                  <td className="px-4 py-2">{r.student_name}</td>
                  <td className="px-4 py-2">{r.class_name}</td>
                  <td className="px-4 py-2 text-xs text-gray-600">
                    {formatDate(r.period_start)} → {formatDate(r.period_end)}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {formatDate(r.due_date) || '—'}
                    {r.is_overdue && (
                      <span className="ml-1 text-red-600 font-medium">(quá hạn)</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">{formatCurrency(r.total)}</td>
                  <td className="px-4 py-2 text-right text-emerald-600">{formatCurrency(r.paid_amount)}</td>
                  <td className="px-4 py-2 text-right font-semibold text-rose-600">
                    {formatCurrency(r.balance)}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={r.is_overdue ? 'overdue' : r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, color = 'text-gray-900', icon: Icon }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <div className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
        {Icon && <Icon className="h-3.5 w-3.5 text-red-500" />}
        {label}
      </div>
      <div className={`text-base font-semibold ${color}`}>{value}</div>
    </div>
  )
}

function stripEmpty(obj) {
  const out = {}
  for (const k in obj) if (obj[k]) out[k] = obj[k]
  return out
}

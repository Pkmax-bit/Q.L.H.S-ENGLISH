import { useState, useEffect, useCallback, useContext } from 'react'
import { Users, DollarSign, ChevronRight, Sparkles, Search } from 'lucide-react'
import Button from '../common/Button'
import Input from '../common/Input'
import LoadingSpinner from '../common/LoadingSpinner'
import EmptyState from '../common/EmptyState'
import StatusBadge from '../common/StatusBadge'
import ClassStudentsFeeModal from './ClassStudentsFeeModal'
import GenerateInvoicesModal from './GenerateInvoicesModal'
import { ToastContext } from '../../context/ToastContext'
import tuitionService from '../../services/tuition.service'
import { formatCurrency } from '../../utils/formatCurrency'

const POLICY_LABELS = {
  per_class: 'Trọn gói',
  monthly: 'Theo tháng',
  per_session: 'Theo buổi',
}

export default function ClassFeeSummary() {
  const { error: showError } = useContext(ToastContext)
  const [yearMonth, setYearMonth] = useState(new Date().toISOString().slice(0, 7))
  const [search, setSearch] = useState('')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedClass, setSelectedClass] = useState(null)
  const [showGenerate, setShowGenerate] = useState(false)
  const [allClasses, setAllClasses] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await tuitionService.getClassesSummary({
        year_month: yearMonth || undefined,
        search: search || undefined,
      })
      const list = res.data?.data || res.data || []
      setData(Array.isArray(list) ? list : [])
      setAllClasses(Array.isArray(list) ? list : [])
    } catch (err) {
      showError(err.response?.data?.message || 'Không tải được dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [yearMonth, search, showError])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  const overall = data.reduce(
    (acc, c) => {
      acc.classes += 1
      acc.enrolled += c.enrolled_count
      acc.paid += c.paid_count
      acc.unpaid += c.unpaid_count
      acc.outstanding += c.total_outstanding
      return acc
    },
    { classes: 0, enrolled: 0, paid: 0, unpaid: 0, outstanding: 0 }
  )

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <Input
            label="Kỳ (tháng)"
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tìm lớp</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tên lớp..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Button variant="outline" icon={Sparkles} onClick={() => setShowGenerate(true)}>
              Sinh hóa đơn
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryCard label="Số lớp" value={overall.classes} />
        <SummaryCard label="Tổng HS" value={overall.enrolled} icon={Users} />
        <SummaryCard label="Đã đóng" value={overall.paid} color="text-emerald-600" />
        <SummaryCard label="Chưa đóng" value={overall.unpaid} color="text-rose-600" />
        <SummaryCard label="Còn nợ" value={formatCurrency(overall.outstanding)} color="text-rose-700" />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : data.length === 0 ? (
        <EmptyState message="Không có lớp phù hợp" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-100 text-left text-gray-600">
                <th className="px-4 py-3 font-medium">Lớp</th>
                <th className="px-4 py-3 font-medium">Chế độ</th>
                <th className="px-4 py-3 font-medium text-center">Sĩ số</th>
                <th className="px-4 py-3 font-medium text-center">Đã đóng</th>
                <th className="px-4 py-3 font-medium text-center">Chưa đóng</th>
                <th className="px-4 py-3 font-medium text-right">Còn nợ</th>
                <th className="px-4 py-3 font-medium text-right w-32">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-blue-50/30">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{c.name}</div>
                    <div className="text-xs text-gray-500">
                      GV: {c.teacher_name || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.fee_policy ? (
                      <div>
                        <div className="text-sm">{POLICY_LABELS[c.fee_policy]}</div>
                        <div className="text-xs text-gray-500">{formatCurrency(c.fee_amount)}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-amber-600">Chưa cấu hình</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-medium">{c.enrolled_count}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      {c.paid_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.unpaid_count > 0
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {c.unpaid_count}
                      {c.overdue_count > 0 && (
                        <span className="ml-1 text-red-700">({c.overdue_count} quá hạn)</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-rose-600">
                    {formatCurrency(c.total_outstanding)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      icon={DollarSign}
                      iconPosition="left"
                      onClick={() => setSelectedClass(c)}
                    >
                      Thu
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedClass && (
        <ClassStudentsFeeModal
          isOpen={!!selectedClass}
          classInfo={selectedClass}
          yearMonth={yearMonth}
          onClose={() => setSelectedClass(null)}
          onChanged={load}
        />
      )}

      {showGenerate && (
        <GenerateInvoicesModal
          isOpen={showGenerate}
          onClose={() => setShowGenerate(false)}
          classes={allClasses.map((c) => ({ id: c.id, name: c.name, fee_policy: c.fee_policy }))}
          onSuccess={() => {
            setShowGenerate(false)
            load()
          }}
        />
      )}
    </div>
  )
}

function SummaryCard({ label, value, color = 'text-gray-900', icon: Icon }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <div className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <div className={`text-base font-semibold ${color}`}>{value}</div>
    </div>
  )
}

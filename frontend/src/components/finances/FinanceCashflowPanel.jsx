import { useState, useEffect, useCallback, useContext } from 'react'
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import Input from '../common/Input'
import LoadingSpinner from '../common/LoadingSpinner'
import { ToastContext } from '../../context/ToastContext'
import teacherPayrollService from '../../services/teacherPayroll.service'
import { formatCurrency } from '../../utils/formatCurrency'

/** Tổng quan thu học phí vs chi lương GV. */
export default function FinanceCashflowPanel() {
  const { error: showError } = useContext(ToastContext)
  const [from, setFrom] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await teacherPayrollService.getOverview({ from, to })
      setData(res.data?.data || res.data)
    } catch (err) {
      showError(err.response?.data?.message || 'Không tải được tổng quan')
    } finally {
      setLoading(false)
    }
  }, [from, to, showError])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-4">
      <div className="app-card p-4 flex flex-wrap gap-3 items-end">
        <Input label="Từ ngày" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="Đến ngày" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Card
            icon={TrendingUp}
            label="Thu học phí"
            value={formatCurrency(data.tuition_income)}
            color="text-emerald-600"
          />
          <Card
            icon={TrendingDown}
            label="Đã chi lương GV"
            value={formatCurrency(data.teacher_pay_expense)}
            color="text-rose-600"
          />
          <Card
            icon={Wallet}
            label="Chờ chi lương GV"
            value={formatCurrency(data.teacher_pay_pending)}
            color="text-amber-700"
          />
          <Card label="Chi khác" value={formatCurrency(data.other_expense)} />
          <Card
            label="Còn lại (thu HP − lương đã chi)"
            value={formatCurrency(data.net_from_tuition)}
            color={data.net_from_tuition >= 0 ? 'text-emerald-700' : 'text-rose-700'}
            wide
          />
        </div>
      ) : null}

      <p className="text-xs text-stone-500">
        Thu học phí lấy từ khoản thu thực tế khi ghi nhận thanh toán hóa đơn. Chi lương GV từ sổ thu chi (danh mục «Lương giáo viên»).
      </p>
    </div>
  )
}

function Card({ icon: Icon, label, value, color = 'text-stone-900', wide }) {
  return (
    <div className={`app-card p-4 ${wide ? 'sm:col-span-2 lg:col-span-1' : ''}`}>
      {Icon && <Icon className="h-5 w-5 text-amber-600 mb-2" />}
      <div className="text-xs text-stone-500">{label}</div>
      <div className={`text-xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  )
}

import { useCallback, useMemo } from 'react'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { useFetch } from '../../hooks/useFetch'
import { formatCurrency } from '../../utils/formatCurrency'
import financesService from '../../services/finances.service'
import LoadingSpinner from '../common/LoadingSpinner'

const MONTHS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']

export default function FinanceSummary() {
  const fetchSummary = useCallback(() => financesService.getSummary(), [])
  const { data: summaryData, loading } = useFetch(fetchSummary)

  const summary = summaryData || {}
  const totalIncome = summary.totalIncome ?? summary.total_income ?? 0
  const totalExpense = summary.totalExpense ?? summary.total_expense ?? 0
  const balance = totalIncome - totalExpense
  const monthlyData = summary.monthly || summary.monthlyData || []

  const chartData = useMemo(() => {
    return MONTHS.map((label, i) => {
      const found = monthlyData.find((d) => d.month === i + 1)
      return {
        label,
        income: found?.income || 0,
        expense: found?.expense || 0,
      }
    })
  }, [monthlyData])

  const maxVal = useMemo(() => {
    return Math.max(1, ...chartData.map((d) => Math.max(d.income, d.expense)))
  }, [chartData])

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Tổng thu</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Tổng chi</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center">
              <TrendingDown className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Số dư</p>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(balance)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly chart */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Thu chi theo tháng</h3>

        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-gray-600">Thu</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-400" />
            <span className="text-gray-600">Chi</span>
          </div>
        </div>

        <div className="flex items-end gap-2 h-48">
          {chartData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-0.5 items-end h-40">
                <div
                  className="flex-1 bg-green-400 rounded-t-sm transition-all hover:bg-green-500"
                  style={{ height: `${(d.income / maxVal) * 100}%`, minHeight: d.income > 0 ? '4px' : '0' }}
                  title={`Thu: ${formatCurrency(d.income)}`}
                />
                <div
                  className="flex-1 bg-red-300 rounded-t-sm transition-all hover:bg-red-400"
                  style={{ height: `${(d.expense / maxVal) * 100}%`, minHeight: d.expense > 0 ? '4px' : '0' }}
                  title={`Chi: ${formatCurrency(d.expense)}`}
                />
              </div>
              <span className="text-xs text-gray-500">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

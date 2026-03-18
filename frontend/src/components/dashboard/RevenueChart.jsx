import { useMemo } from 'react'
import { formatCurrency } from '../../utils/formatCurrency'

const MONTHS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']

export default function RevenueChart({ data = [] }) {
  const chartData = useMemo(() => {
    const months = MONTHS.map((label, i) => {
      const found = data.find((d) => d.month === i + 1)
      return {
        label,
        income: found?.income || 0,
        expense: found?.expense || 0,
      }
    })
    return months
  }, [data])

  const maxVal = useMemo(() => {
    return Math.max(1, ...chartData.map((d) => Math.max(d.income, d.expense)))
  }, [chartData])

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Thu chi theo tháng</h3>

      {/* Legend */}
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

      {/* Bar chart */}
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
  )
}

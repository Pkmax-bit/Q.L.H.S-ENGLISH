import { useCallback, useMemo } from 'react'
import { useFetch } from '../../hooks/useFetch'
import financesService from '../../services/finances.service'
import LoadingSpinner from '../common/LoadingSpinner'

// CategoryManager - shows unique category values from existing finance records
// No separate finance_categories table exists - categories are plain text on each finance record
export default function CategoryManager() {
  const fetchFinances = useCallback(() => financesService.getAll(), [])
  const { data: financesData, loading } = useFetch(fetchFinances)
  const finances = Array.isArray(financesData) ? financesData : financesData?.finances || []

  // Extract unique categories with counts
  const categories = useMemo(() => {
    const map = {}
    finances.forEach((f) => {
      if (f.category) {
        if (!map[f.category]) {
          map[f.category] = { name: f.category, count: 0, income: 0, expense: 0 }
        }
        map[f.category].count++
        if (f.type === 'income') map[f.category].income += Number(f.amount) || 0
        if (f.type === 'expense') map[f.category].expense += Number(f.amount) || 0
      }
    })
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name))
  }, [finances])

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{categories.length} danh mục</p>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          Chưa có danh mục nào. Danh mục sẽ xuất hiện khi bạn thêm giao dịch với trường &quot;Danh mục&quot;.
        </p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Danh mục</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Số giao dịch</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tổng thu</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tổng chi</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.name} className="border-b border-gray-100 hover:bg-blue-50/30">
                  <td className="px-4 py-3 font-medium text-gray-700">{cat.name}</td>
                  <td className="px-4 py-3 text-gray-600">{cat.count}</td>
                  <td className="px-4 py-3 text-green-600 font-medium">
                    {cat.income > 0 ? `+${cat.income.toLocaleString('vi-VN')} ₫` : '—'}
                  </td>
                  <td className="px-4 py-3 text-red-600 font-medium">
                    {cat.expense > 0 ? `-${cat.expense.toLocaleString('vi-VN')} ₫` : '—'}
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

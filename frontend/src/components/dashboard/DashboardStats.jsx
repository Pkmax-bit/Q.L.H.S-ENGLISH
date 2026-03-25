import { Users, GraduationCap, School, Wallet, BookOpen, ClipboardList } from 'lucide-react'
import clsx from 'clsx'
import { formatCurrency } from '../../utils/formatCurrency'
import { useAuth } from '../../hooks/useAuth'

const allStats = [
  { key: 'teachers', label: 'Giáo viên', icon: Users, color: 'blue', value: 0, roles: ['admin'] },
  { key: 'students', label: 'Học sinh', icon: GraduationCap, color: 'green', value: 0, roles: ['admin'] },
  { key: 'classes', label: 'Lớp học', icon: School, color: 'purple', value: 0, roles: ['admin', 'teacher', 'student'] },
  { key: 'revenue', label: 'Doanh thu tháng', icon: Wallet, color: 'amber', value: 0, roles: ['admin'] },
  { key: 'lessons', label: 'Bài học', icon: BookOpen, color: 'blue', value: 0, roles: ['teacher', 'student'] },
  { key: 'assignments', label: 'Bài tập', icon: ClipboardList, color: 'amber', value: 0, roles: ['teacher', 'student'] },
]

const colorClasses = {
  blue: { bg: 'bg-blue-50', icon: 'bg-blue-500', text: 'text-blue-600' },
  green: { bg: 'bg-green-50', icon: 'bg-green-500', text: 'text-green-600' },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-500', text: 'text-purple-600' },
  amber: { bg: 'bg-amber-50', icon: 'bg-amber-500', text: 'text-amber-600' },
}

export default function DashboardStats({ stats }) {
  const { user } = useAuth()
  const userRole = user?.role || 'student'

  const visibleStats = allStats.filter(
    (item) => item.roles.includes(userRole)
  )

  const items = visibleStats.map((d) => ({
    ...d,
    value: stats?.[d.key] ?? d.value,
  }))

  // Dynamic grid columns based on visible items count
  const gridCols = items.length <= 2
    ? 'grid-cols-1 sm:grid-cols-2'
    : items.length === 3
      ? 'grid-cols-1 sm:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'

  return (
    <div className={clsx('grid gap-4', gridCols)}>
      {items.map((item) => {
        const Icon = item.icon
        const colors = colorClasses[item.color]
        return (
          <div
            key={item.key}
            className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{item.label}</p>
                <p className={clsx('text-2xl font-bold', colors.text)}>
                  {item.key === 'revenue' ? formatCurrency(item.value) : item.value}
                </p>
              </div>
              <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center', colors.icon)}>
                <Icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

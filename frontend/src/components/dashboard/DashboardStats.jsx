import {
  Users, GraduationCap, School, Wallet, BookOpen, ClipboardList, Building2, TrendingUp,
} from 'lucide-react'
import clsx from 'clsx'
import { formatCurrency } from '../../utils/formatCurrency'
import StatCard from './StatCard'

const ADMIN_STATS = [
  { key: 'teachers', label: 'Giáo viên', icon: Users, color: 'blue' },
  { key: 'students', label: 'Học sinh', icon: GraduationCap, color: 'green' },
  { key: 'classes', label: 'Lớp đang mở', icon: School, color: 'purple' },
  { key: 'revenue', label: 'Doanh thu tháng', icon: Wallet, color: 'amber', format: 'currency' },
  { key: 'active_subjects', label: 'Môn học', icon: BookOpen, color: 'blue' },
  { key: 'total_facilities', label: 'Phòng học', icon: Building2, color: 'slate' },
  { key: 'pending_enrollments', label: 'Yêu cầu nhập học', icon: ClipboardList, color: 'orange' },
  { key: 'monthly_net', label: 'Lãi/lỗ tháng', icon: TrendingUp, color: 'green', format: 'currency' },
]

export default function DashboardStats({ stats = {}, onNavigate }) {
  const items = ADMIN_STATS.map((d) => {
    let value = stats[d.key] ?? stats[d.key.replace(/s$/, '')] ?? 0
    if (d.key === 'teachers') value = stats.teachers ?? stats.active_teachers ?? 0
    if (d.key === 'students') value = stats.students ?? stats.active_students ?? 0
    if (d.key === 'classes') value = stats.classes ?? stats.active_classes ?? 0
    if (d.key === 'revenue') value = stats.revenue ?? stats.monthly_income ?? 0
    if (d.format === 'currency') value = formatCurrency(value)
    return { ...d, value }
  })

  return (
    <div className={clsx('grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4')}>
      {items.map((item) => (
        <StatCard
          key={item.key}
          label={item.label}
          value={item.value}
          icon={item.icon}
          color={item.color}
          onClick={
            item.key === 'pending_enrollments' && onNavigate
              ? () => onNavigate('/enrollment-requests')
              : undefined
          }
          hint={
            item.key === 'pending_enrollments' && (stats.pending_enrollments || 0) > 0
              ? 'Cần duyệt'
              : undefined
          }
        />
      ))}
    </div>
  )
}

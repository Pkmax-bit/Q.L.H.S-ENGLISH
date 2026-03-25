import { useCallback } from 'react'
import DashboardStats from '../components/dashboard/DashboardStats'
import RevenueChart from '../components/dashboard/RevenueChart'
import RecentActivity from '../components/dashboard/RecentActivity'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useFetch } from '../hooks/useFetch'
import { useAuth } from '../hooks/useAuth'
import api from '../services/api'

export default function DashboardPage() {
  const { user } = useAuth()
  const fetchDashboard = useCallback(() => api.get('/dashboard'), [])
  const { data, loading } = useFetch(fetchDashboard)

  const dashboard = data || {}
  const isAdmin = user?.role === 'admin'

  if (loading) return <LoadingSpinner message="Đang tải tổng quan..." />

  const roleLabel = {
    admin: 'Quản trị viên',
    teacher: 'Giáo viên',
    student: 'Học sinh',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
        <p className="text-sm text-gray-500 mt-1">
          Xin chào, {user?.name || 'bạn'} ({roleLabel[user?.role] || user?.role})
        </p>
      </div>

      <DashboardStats stats={dashboard.stats || dashboard} />

      {/* Revenue chart and recent activity - admin only */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueChart data={dashboard.revenueChart || dashboard.monthly || []} />
          <RecentActivity activities={dashboard.recentActivities || dashboard.activities || []} />
        </div>
      )}

      {/* Teacher/Student: show recent activity only (no revenue chart) */}
      {!isAdmin && (
        <div>
          <RecentActivity activities={dashboard.recentActivities || dashboard.activities || []} />
        </div>
      )}
    </div>
  )
}

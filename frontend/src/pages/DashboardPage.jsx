import { useCallback } from 'react'
import DashboardStats from '../components/dashboard/DashboardStats'
import RevenueChart from '../components/dashboard/RevenueChart'
import RecentActivity from '../components/dashboard/RecentActivity'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useFetch } from '../hooks/useFetch'
import api from '../services/api'

export default function DashboardPage() {
  const fetchDashboard = useCallback(() => api.get('/dashboard'), [])
  const { data, loading } = useFetch(fetchDashboard)

  const dashboard = data || {}

  if (loading) return <LoadingSpinner message="Đang tải tổng quan..." />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
        <p className="text-sm text-gray-500 mt-1">Chào mừng bạn trở lại</p>
      </div>

      <DashboardStats stats={dashboard.stats || dashboard} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={dashboard.revenueChart || dashboard.monthly || []} />
        <RecentActivity activities={dashboard.recentActivities || dashboard.activities || []} />
      </div>
    </div>
  )
}

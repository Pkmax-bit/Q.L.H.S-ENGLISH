import { Clock } from 'lucide-react'
import { formatDateTime } from '../../utils/formatDate'

export default function RecentActivity({ activities = [] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Hoạt động gần đây</h3>

      {activities.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Chưa có hoạt động nào</p>
      ) : (
        <div className="space-y-3">
          {activities.slice(0, 10).map((activity, index) => (
            <div key={activity._id || index} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock className="h-4 w-4 text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">{activity.description || activity.message}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDateTime(activity.createdAt || activity.date)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import {
  Clock, UserPlus, School, Wallet, ArrowDownCircle, ArrowUpCircle,
} from 'lucide-react'
import { formatDateTime } from '../../utils/formatDate'

const TYPE_META = {
  student_enrolled: { icon: UserPlus, color: 'text-emerald-600 bg-emerald-50' },
  teacher_added: { icon: UserPlus, color: 'text-blue-600 bg-blue-50' },
  class_created: { icon: School, color: 'text-violet-600 bg-violet-50' },
  finance_income: { icon: ArrowUpCircle, color: 'text-green-600 bg-green-50' },
  finance_expense: { icon: ArrowDownCircle, color: 'text-red-600 bg-red-50' },
}

function getMeta(type) {
  return TYPE_META[type] || { icon: Clock, color: 'text-stone-500 bg-stone-50' }
}

export default function RecentActivity({ activities = [] }) {
  return (
    <div className="app-card p-5 h-full">
      <h3 className="text-base font-semibold text-stone-900 mb-4">Hoạt động gần đây</h3>

      {activities.length === 0 ? (
        <p className="text-sm text-stone-400 text-center py-10">Chưa có hoạt động nào</p>
      ) : (
        <div className="space-y-3 max-h-[22rem] overflow-y-auto pr-1">
          {activities.slice(0, 12).map((activity, index) => {
            const meta = getMeta(activity.type)
            const Icon = meta.icon
            return (
              <div key={activity.id || activity._id || index} className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm text-stone-700 leading-snug">
                    {activity.description || activity.message || activity.title}
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    {formatDateTime(activity.createdAt || activity.created_at || activity.date)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

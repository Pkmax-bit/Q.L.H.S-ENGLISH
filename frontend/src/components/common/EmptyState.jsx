import { Inbox } from 'lucide-react'

export default function EmptyState({ message = 'Không có dữ liệu', icon: Icon = Inbox, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <p className="text-gray-500 text-sm mb-4">{message}</p>
      {action && action}
    </div>
  )
}

import { ClipboardList, Clock, Eye, EyeOff, HelpCircle, AlertTriangle } from 'lucide-react'
import { formatDate } from '../../../utils/formatDate'

const TYPE_LABELS = {
  multiple_choice: { label: 'Trắc nghiệm', color: 'bg-blue-100 text-blue-700' },
  essay: { label: 'Tự luận', color: 'bg-amber-100 text-amber-700' },
  mixed: { label: 'Kết hợp', color: 'bg-purple-100 text-purple-700' },
}

export default function ClassAssignmentsTab({ assignments, classId }) {
  if (assignments.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Chưa có bài tập nào</p>
        <p className="text-sm text-gray-400 mt-1">Bài tập sẽ hiển thị ở đây khi được tạo</p>
      </div>
    )
  }

  const now = new Date()

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">
          Danh sách bài tập ({assignments.length})
        </h3>
      </div>
      <div className="divide-y divide-gray-100">
        {assignments.map((assignment) => {
          const typeInfo = TYPE_LABELS[assignment.assignment_type] || TYPE_LABELS.mixed
          const isOverdue = assignment.due_date && new Date(assignment.due_date) < now
          const isDueSoon = assignment.due_date && !isOverdue && (new Date(assignment.due_date) - now) < 24 * 60 * 60 * 1000

          return (
            <div
              key={assignment.id}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-800 truncate">{assignment.title}</p>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <HelpCircle className="h-3 w-3" />
                      {assignment.question_count} câu hỏi
                    </span>
                    <span>{assignment.total_points} điểm</span>
                    {assignment.time_limit_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {assignment.time_limit_minutes} phút
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Due date */}
                {assignment.due_date && (
                  <span className={`text-xs px-2 py-1 rounded-lg flex items-center gap-1 ${
                    isOverdue
                      ? 'bg-red-100 text-red-700'
                      : isDueSoon
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}>
                    {isOverdue && <AlertTriangle className="h-3 w-3" />}
                    {formatDate(assignment.due_date)}
                  </span>
                )}

                {/* Published status */}
                {assignment.is_published ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                    <Eye className="h-3 w-3" />
                    Đã xuất bản
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">
                    <EyeOff className="h-3 w-3" />
                    Nháp
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

import { useCallback } from 'react'
import { School, Users, Calendar, BookOpen } from 'lucide-react'
import LoadingSpinner from '../common/LoadingSpinner'
import { useFetch } from '../../hooks/useFetch'
import classesService from '../../services/classes.service'
import { formatDate } from '../../utils/formatDate'

const CLASS_COLORS = [
  'from-blue-500 to-blue-700',
  'from-green-500 to-green-700',
  'from-purple-500 to-purple-700',
  'from-amber-500 to-amber-700',
  'from-red-500 to-red-700',
  'from-teal-500 to-teal-700',
  'from-pink-500 to-pink-700',
  'from-indigo-500 to-indigo-700',
]

const CLASS_ICONS = ['📚', '📐', '🔬', '🎨', '🌍', '💻', '🎵', '⚽']

export default function StudentClassGrid({ onSelectClass }) {
  const fetchClasses = useCallback(() => classesService.getAll(), [])
  const { data: classesData, loading } = useFetch(fetchClasses)
  const classes = Array.isArray(classesData) ? classesData : classesData?.classes || []

  if (loading) return <LoadingSpinner message="Đang tải lớp học..." />

  if (classes.length === 0) {
    return (
      <div className="text-center py-16">
        <School className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-500">Bạn chưa tham gia lớp nào</h2>
        <p className="text-gray-400 mt-2">Liên hệ giáo viên hoặc quản trị viên để được thêm vào lớp học</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📖 Học tập</h1>
        <p className="text-sm text-gray-500 mt-1">Chọn lớp học để bắt đầu</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {classes.map((cls, idx) => {
          const colorClass = CLASS_COLORS[idx % CLASS_COLORS.length]
          const icon = CLASS_ICONS[idx % CLASS_ICONS.length]

          return (
            <button
              key={cls.id}
              onClick={() => onSelectClass(cls)}
              className="group text-left bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              {/* Color header */}
              <div className={`bg-gradient-to-r ${colorClass} px-5 py-6 relative`}>
                <span className="text-4xl absolute top-3 right-4 opacity-30 group-hover:opacity-50 transition-opacity">
                  {icon}
                </span>
                <h3 className="text-white font-bold text-lg leading-tight pr-12">
                  {cls.name}
                </h3>
                {cls.subject_name && (
                  <p className="text-white/70 text-sm mt-1">{cls.subject_name}</p>
                )}
              </div>

              {/* Info */}
              <div className="px-5 py-4 space-y-2.5">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span>Giáo viên: {cls.teacher?.full_name || cls.teacher_name || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <BookOpen className="h-4 w-4 text-gray-400" />
                  <span>Sĩ số: {cls.student_count ?? 0} học sinh</span>
                </div>
                {cls.start_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{formatDate(cls.start_date)}{cls.end_date ? ` — ${formatDate(cls.end_date)}` : ''}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                <span className="text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
                  Vào lớp học →
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

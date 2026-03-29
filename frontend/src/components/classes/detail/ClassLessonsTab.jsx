import { BookOpen, FileText, Youtube, HardDrive, Eye, EyeOff } from 'lucide-react'
import { formatDate } from '../../../utils/formatDate'

const CONTENT_ICONS = {
  text: FileText,
  file: HardDrive,
  youtube: Youtube,
  drive: HardDrive,
}

export default function ClassLessonsTab({ lessons, classId }) {
  if (lessons.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Chưa có bài học nào</p>
        <p className="text-sm text-gray-400 mt-1">Bài học sẽ hiển thị ở đây khi được tạo</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">
          Danh sách bài học ({lessons.length})
        </h3>
      </div>
      <div className="divide-y divide-gray-100">
        {lessons.map((lesson, idx) => {
          const Icon = CONTENT_ICONS[lesson.content_type] || FileText
          return (
            <div
              key={lesson.id}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-sm font-bold text-green-700">
                  {idx + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800">{lesson.title}</p>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
                      <Icon className="h-3 w-3" />
                      {lesson.content_type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Tạo ngày: {formatDate(lesson.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {lesson.is_published ? (
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

import Modal from '../common/Modal'
import StatusBadge from '../common/StatusBadge'
import { formatDate } from '../../utils/formatDate'
import { BookOpen, Calendar, Hash, FileText, Link } from 'lucide-react'

const contentTypeMap = {
  text: 'Văn bản',
  video: 'Video',
  file: 'Tệp tin',
}

export default function LessonDetail({ isOpen, onClose, lesson }) {
  if (!lesson) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chi tiết bài học" size="xl">
      <div className="space-y-5">
        {/* Title */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">{lesson.title}</h3>
          <StatusBadge
            status={lesson.is_published ? 'active' : 'inactive'}
            label={lesson.is_published ? 'Đã xuất bản' : 'Nháp'}
          />
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-gray-400" />
            <span>Lớp: {lesson.class?.name || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-gray-400" />
            <span>Loại: {contentTypeMap[lesson.content_type] || lesson.content_type || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Hash className="h-4 w-4 text-gray-400" />
            <span>Thứ tự: {lesson.order_index ?? '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span>{formatDate(lesson.created_at)}</span>
          </div>
        </div>

        {/* Content */}
        {lesson.content && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-600 mb-2">Nội dung</p>
            <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4">
              {lesson.content}
            </div>
          </div>
        )}

        {/* File URL */}
        {lesson.file_url && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4 text-blue-500" />
              <a
                href={lesson.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                Xem tệp đính kèm
              </a>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

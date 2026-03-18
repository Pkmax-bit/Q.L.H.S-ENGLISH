import Modal from '../common/Modal'
import StatusBadge from '../common/StatusBadge'
import RichContentViewer from '../common/RichContentViewer'
import { formatDate } from '../../utils/formatDate'
import { BookOpen, Calendar, Hash, FileText, Link, Youtube, FolderOpen, ExternalLink } from 'lucide-react'

const contentTypeMap = {
  text: 'Văn bản',
  video: 'Video',
  file: 'Tệp tin',
}

function extractYoutubeId(url) {
  if (!url) return null
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/)
  return match ? match[1] : null
}

export default function LessonDetail({ isOpen, onClose, lesson }) {
  if (!lesson) return null

  const ytId = extractYoutubeId(lesson.youtube_url)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chi tiết bài học" size="2xl">
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

        {/* YouTube embed */}
        {ytId && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
              <Youtube className="h-4 w-4 text-red-500" /> Video bài giảng
            </p>
            <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
              <iframe
                src={`https://www.youtube.com/embed/${ytId}`}
                title={lesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>
        )}

        {/* YouTube link (if no embed possible) */}
        {lesson.youtube_url && !ytId && (
          <div className="pt-3 border-t border-gray-100">
            <a
              href={lesson.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-800"
            >
              <Youtube className="h-4 w-4" /> Xem video bài giảng
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Content */}
        {lesson.content && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-600 mb-2">📝 Nội dung</p>
            <div className="bg-white rounded-lg border border-gray-200 p-5 max-h-[500px] overflow-y-auto">
              <RichContentViewer content={lesson.content} />
            </div>
          </div>
        )}

        {/* Resource links */}
        {(lesson.file_url || lesson.drive_url) && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-600 mb-3">📎 Tài liệu đính kèm</p>
            <div className="flex flex-wrap gap-3">
              {lesson.drive_url && (
                <a
                  href={lesson.drive_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 hover:bg-yellow-100 transition-colors"
                >
                  <FolderOpen className="h-4 w-4" />
                  Google Drive
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {lesson.file_url && (
                <a
                  href={lesson.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 hover:bg-blue-100 transition-colors"
                >
                  <Link className="h-4 w-4" />
                  Tệp đính kèm
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

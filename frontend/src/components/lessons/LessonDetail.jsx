import Modal from '../common/Modal'
import { formatDate } from '../../utils/formatDate'
import { BookOpen, Youtube, HardDrive, FileText, Calendar, Hash } from 'lucide-react'

function getYouTubeId(url) {
  if (!url) return null
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/)
  return match ? match[1] : null
}

export default function LessonDetail({ isOpen, onClose, lesson }) {
  if (!lesson) return null

  const videoId = getYouTubeId(lesson.youtube_url || lesson.youtubeUrl)
  const driveUrl = lesson.drive_url || lesson.driveUrl
  const attachments = lesson.attachments || lesson.files || []

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chi tiết bài học" size="xl">
      <div className="space-y-5">
        {/* Title */}
        <div>
          <h3 className="text-xl font-bold text-gray-900">{lesson.title}</h3>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-gray-400" />
            <span>{lesson.subject?.name || lesson.subjectName || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Hash className="h-4 w-4 text-gray-400" />
            <span>Thứ tự: {lesson.order_index ?? lesson.orderIndex ?? '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span>{formatDate(lesson.createdAt)}</span>
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

        {/* YouTube embed */}
        {videoId && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Youtube className="h-4 w-4 text-red-500" />
              <p className="text-sm font-medium text-gray-600">Video bài giảng</p>
            </div>
            <div className="relative w-full pb-[56.25%] rounded-lg overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title="Video bài giảng"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>
        )}

        {/* Drive link */}
        {driveUrl && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-blue-500" />
              <a
                href={driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                Xem tài liệu trên Google Drive
              </a>
            </div>
          </div>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-600 mb-2">Tệp đính kèm</p>
            <div className="space-y-2">
              {attachments.map((file, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <FileText className="h-5 w-5 text-gray-500" />
                  <a
                    href={file.url || file.path || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex-1 truncate"
                  >
                    {file.name || file.filename || `Tệp ${idx + 1}`}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

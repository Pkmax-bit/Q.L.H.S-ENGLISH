import Modal from '../common/Modal'
import { formatDate } from '../../utils/formatDate'
import { BookOpen, Calendar, Hash, Youtube, HardDrive, Check, X } from 'lucide-react'

const typeLabelMap = {
  essay: 'Tự luận',
  multiple_choice: 'Trắc nghiệm',
  mixed: 'Hỗn hợp',
}

function getYouTubeId(url) {
  if (!url) return null
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/)
  return match ? match[1] : null
}

export default function AssignmentDetail({ isOpen, onClose, assignment }) {
  if (!assignment) return null

  const questions = assignment.questions || []
  const videoId = getYouTubeId(assignment.youtube_url || assignment.youtubeUrl)
  const driveUrl = assignment.drive_url || assignment.driveUrl

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chi tiết bài tập" size="xl">
      <div className="space-y-5">
        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900">{assignment.title}</h3>

        {/* Meta */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-gray-400" />
            <span>{assignment.subject?.name || assignment.subjectName || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Hash className="h-4 w-4 text-gray-400" />
            <span>Loại: {typeLabelMap[assignment.type] || assignment.type}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-blue-600">
              {assignment.total_points ?? assignment.totalPoints ?? '—'} điểm
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span>{formatDate(assignment.createdAt)}</span>
          </div>
        </div>

        {/* Content */}
        {assignment.content && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-600 mb-2">Nội dung / Hướng dẫn</p>
            <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4">
              {assignment.content}
            </div>
          </div>
        )}

        {/* YouTube */}
        {videoId && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Youtube className="h-4 w-4 text-red-500" />
              <p className="text-sm font-medium text-gray-600">Video</p>
            </div>
            <div className="relative w-full pb-[56.25%] rounded-lg overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title="Video"
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
                className="text-sm text-blue-600 hover:underline"
              >
                Xem tài liệu trên Google Drive
              </a>
            </div>
          </div>
        )}

        {/* Questions */}
        {questions.length > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Câu hỏi ({questions.length})
            </p>
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div key={q.id || idx} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium text-gray-800">
                      Câu {idx + 1}: {q.text || '(Chưa có nội dung)'}
                    </p>
                    <span className="text-xs text-blue-600 font-medium ml-2 whitespace-nowrap">
                      {q.points ?? '—'} điểm
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {q.type === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'}
                  </p>

                  {q.type === 'multiple_choice' && q.options && q.options.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      {q.options.map((opt, optIdx) => (
                        <div
                          key={optIdx}
                          className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
                            opt.is_correct ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'
                          }`}
                        >
                          {opt.is_correct ? (
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <X className="h-4 w-4 text-gray-300 flex-shrink-0" />
                          )}
                          <span>
                            {String.fromCharCode(65 + optIdx)}. {opt.text || '(Trống)'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

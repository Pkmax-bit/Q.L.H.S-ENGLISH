import Modal from '../common/Modal'
import StatusBadge from '../common/StatusBadge'
import { formatDate } from '../../utils/formatDate'
import { BookOpen, Calendar, Hash, Clock, Check, X } from 'lucide-react'

const typeLabelMap = {
  essay: 'Tự luận',
  multiple_choice: 'Trắc nghiệm',
  mixed: 'Hỗn hợp',
}

export default function AssignmentDetail({ isOpen, onClose, assignment }) {
  if (!assignment) return null

  const questions = assignment.questions || []

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chi tiết bài tập" size="xl">
      <div className="space-y-5">
        {/* Title */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">{assignment.title}</h3>
          <StatusBadge
            status={assignment.is_published ? 'active' : 'inactive'}
            label={assignment.is_published ? 'Đã xuất bản' : 'Nháp'}
          />
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-gray-400" />
            <span>Lớp: {assignment.class?.name || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Hash className="h-4 w-4 text-gray-400" />
            <span>Loại: {typeLabelMap[assignment.assignment_type] || assignment.assignment_type}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-blue-600">
              {assignment.total_points ?? '—'} điểm
            </span>
          </div>
          {assignment.due_date && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>Hạn nộp: {formatDate(assignment.due_date)}</span>
            </div>
          )}
          {assignment.time_limit_minutes && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>{assignment.time_limit_minutes} phút</span>
            </div>
          )}
        </div>

        {/* Lesson reference */}
        {assignment.lesson && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Bài học:</span> {assignment.lesson.title || '—'}
            </p>
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
                    {q.question_type === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'}
                  </p>

                  {q.question_type === 'multiple_choice' && q.options && q.options.length > 0 && (
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

                  {q.correct_answer && (
                    <div className="mt-2 text-sm text-green-700 bg-green-50 p-2 rounded-lg">
                      <span className="font-medium">Đáp án:</span> {q.correct_answer}
                    </div>
                  )}

                  {q.file_url && (
                    <div className="mt-2">
                      <a href={q.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                        Tệp đính kèm
                      </a>
                    </div>
                  )}

                  {q.youtube_url && (
                    <div className="mt-2">
                      <a href={q.youtube_url} target="_blank" rel="noopener noreferrer" className="text-xs text-red-600 hover:underline">
                        Video YouTube
                      </a>
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

import { useCallback } from 'react'
import {
  ArrowLeft, CheckCircle, XCircle, Clock, Trophy,
  Circle, AlertTriangle, FileText, MessageSquare
} from 'lucide-react'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import RichContentViewer from '../common/RichContentViewer'
import { useFetch } from '../../hooks/useFetch'
import submissionsService from '../../services/submissions.service'

export default function SubmissionResult({ submissionId, onBack }) {
  const fetchSubmission = useCallback(() => submissionsService.getById(submissionId), [submissionId])
  const { data: rawData, loading } = useFetch(fetchSubmission)
  const submission = rawData?.data ?? rawData

  if (loading) return <LoadingSpinner message="Đang tải kết quả..." />

  if (!submission) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <AlertTriangle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Không tìm thấy bài nộp</p>
        <Button variant="outline" icon={ArrowLeft} onClick={onBack} className="mt-4">Quay lại</Button>
      </div>
    )
  }

  const isGraded = submission.status === 'graded'
  const isPending = submission.status === 'submitted'
  const total = submission.total_points || submission.assignments?.total_points || 100
  const scorePercent = isGraded && submission.score !== null ? Math.round((submission.score / total) * 100) : null
  const answers = submission.answers || []
  const timeSpent = submission.time_spent_seconds

  const formatTime = (s) => {
    if (!s) return '—'
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m} phút ${sec} giây`
  }

  const getGrade = (percent) => {
    if (percent >= 90) return { label: 'Xuất sắc', color: 'text-green-600', bg: 'bg-green-50', emoji: '🏆' }
    if (percent >= 75) return { label: 'Giỏi', color: 'text-blue-600', bg: 'bg-blue-50', emoji: '⭐' }
    if (percent >= 50) return { label: 'Khá', color: 'text-amber-600', bg: 'bg-amber-50', emoji: '👍' }
    return { label: 'Cần cố gắng', color: 'text-red-600', bg: 'bg-red-50', emoji: '📚' }
  }

  const correctCount = answers.filter(a => a.is_correct === true).length
  const wrongCount = answers.filter(a => a.is_correct === false).length
  const assignmentTitle = submission.assignment_title || submission.assignments?.title || 'Bài tập'

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> Quay lại
      </button>

      {/* Assignment title */}
      <h1 className="text-xl font-bold text-gray-900 mb-4">{assignmentTitle}</h1>

      {/* Score card */}
      <div className={`rounded-2xl border shadow-sm p-6 mb-6 ${isGraded ? 'bg-white border-gray-200' : 'bg-amber-50 border-amber-200'}`}>
        {isGraded && scorePercent !== null ? (
          <div className="text-center">
            <div className="text-5xl mb-2">{getGrade(scorePercent).emoji}</div>
            <h2 className="text-4xl font-bold text-gray-900">
              {submission.score} <span className="text-lg text-gray-400">/ {total}</span>
            </h2>
            <div className={`inline-block mt-2 px-4 py-1.5 rounded-full text-sm font-semibold ${getGrade(scorePercent).bg} ${getGrade(scorePercent).color}`}>
              {scorePercent}% — {getGrade(scorePercent).label}
            </div>

            {/* Progress bar */}
            <div className="max-w-xs mx-auto mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    scorePercent >= 80 ? 'bg-green-500' : scorePercent >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${scorePercent}%` }}
                />
              </div>
            </div>

            <div className="flex justify-center gap-6 mt-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {formatTime(timeSpent)}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-green-500" /> {correctCount} đúng
              </span>
              <span className="flex items-center gap-1.5">
                <XCircle className="h-4 w-4 text-red-500" /> {wrongCount} sai
              </span>
              <span className="flex items-center gap-1.5">
                <Circle className="h-4 w-4 text-gray-400" /> {answers.length - correctCount - wrongCount} chưa chấm
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-5xl mb-2">📝</div>
            <h2 className="text-xl font-bold text-amber-700">Đã nộp bài — Chờ chấm điểm</h2>
            <p className="text-sm text-amber-600 mt-1">Giáo viên sẽ chấm phần tự luận. Bạn sẽ thấy điểm khi hoàn tất.</p>
            {submission.auto_score > 0 && (
              <div className="mt-3 px-4 py-2 bg-green-50 border border-green-200 rounded-lg inline-block">
                <p className="text-sm text-green-700">
                  Điểm trắc nghiệm (tự chấm): <strong>{submission.auto_score}</strong>
                </p>
              </div>
            )}
            <div className="flex justify-center gap-4 mt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {formatTime(timeSpent)}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-green-500" /> {correctCount} đúng (trắc nghiệm)
              </span>
            </div>
          </div>
        )}

        {submission.feedback && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <MessageSquare className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-blue-700 mb-0.5">Nhận xét của giáo viên:</p>
                <p className="text-sm text-blue-800">{submission.feedback}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Answers review */}
      {answers.length > 0 && (
        <>
          <h3 className="text-lg font-bold text-gray-900 mb-4">📋 Chi tiết câu trả lời ({answers.length} câu)</h3>
          <div className="space-y-4">
            {answers.map((answer, idx) => {
              const q = answer.question || answer.assignment_questions || {}
              const isMCQ = q.question_type === 'multiple_choice'
              const opts = Array.isArray(q.options) ? q.options : []
              const qText = q.question_text || '—'

              return (
                <div key={answer.id || idx} className={`rounded-xl border p-5 ${
                  answer.is_correct === true ? 'border-green-200 bg-green-50/30' :
                  answer.is_correct === false ? 'border-red-200 bg-red-50/30' :
                  'border-gray-200 bg-white'
                }`}>
                  {/* Question header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        <span className="text-blue-600 mr-2">Câu {idx + 1}.</span>
                        {qText.includes('<') ? (
                          <RichContentViewer content={qText} className="inline" />
                        ) : (
                          qText
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {isMCQ ? '🔘 Trắc nghiệm' : '✍️ Tự luận'} • {q.points || 0} điểm
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      {answer.score !== null && answer.score !== undefined && (
                        <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                          answer.is_correct ? 'bg-green-100 text-green-700' :
                          answer.is_correct === false ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {answer.score}/{q.points || 0}
                        </span>
                      )}
                      {answer.is_correct === true && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {answer.is_correct === false && <XCircle className="h-5 w-5 text-red-500" />}
                      {answer.is_correct === null && <Circle className="h-5 w-5 text-gray-300" />}
                    </div>
                  </div>

                  {/* MCQ options review */}
                  {isMCQ && opts.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {opts.map((opt, oi) => {
                        const isSelected = answer.selected_option_index === oi
                        const isCorrectOpt = opt.is_correct === true

                        return (
                          <div key={oi} className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                            isSelected && isCorrectOpt ? 'bg-green-100 text-green-800 border border-green-300' :
                            isSelected && !isCorrectOpt ? 'bg-red-100 text-red-800 border border-red-300' :
                            isCorrectOpt ? 'bg-green-50 text-green-700 border border-green-200' :
                            'bg-gray-50 text-gray-600 border border-transparent'
                          }`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              isSelected ? (isCorrectOpt ? 'bg-green-500 text-white' : 'bg-red-500 text-white') :
                              isCorrectOpt ? 'bg-green-200 text-green-700' : 'bg-gray-200 text-gray-500'
                            }`}>
                              {String.fromCharCode(65 + oi)}
                            </div>
                            <span className="flex-1">{opt.text}</span>
                            {isSelected && <span className="text-xs font-medium ml-auto">← Bạn chọn</span>}
                            {isCorrectOpt && !isSelected && <span className="text-xs ml-auto text-green-600 font-medium">← Đáp án đúng</span>}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Essay answer */}
                  {!isMCQ && (
                    <div className="bg-white rounded-lg border border-gray-200 p-3 mb-3">
                      <p className="text-xs text-gray-400 mb-1">Câu trả lời của bạn:</p>
                      {answer.answer_text ? (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{answer.answer_text}</p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Chưa trả lời</p>
                      )}
                    </div>
                  )}

                  {/* Correct answer for essay */}
                  {!isMCQ && q.correct_answer && isGraded && (
                    <div className="bg-green-50 rounded-lg border border-green-200 p-3 mb-3">
                      <p className="text-xs text-green-600 mb-1 font-medium">Đáp án tham khảo:</p>
                      <p className="text-sm text-green-800 whitespace-pre-wrap">{q.correct_answer}</p>
                    </div>
                  )}

                  {/* Per-answer feedback */}
                  {answer.feedback && (
                    <div className="flex items-start gap-2 p-2.5 bg-blue-50 rounded-lg">
                      <MessageSquare className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-blue-700">{answer.feedback}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Back button at bottom */}
      <div className="mt-6 text-center">
        <Button variant="outline" icon={ArrowLeft} onClick={onBack}>
          Quay lại
        </Button>
      </div>
    </div>
  )
}

import { useState, useCallback } from 'react'
import {
  ArrowLeft, CheckCircle, XCircle, Clock, Trophy,
  Circle, AlertTriangle, FileText, MessageSquare
} from 'lucide-react'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import { useFetch } from '../../hooks/useFetch'
import submissionsService from '../../services/submissions.service'

export default function SubmissionResult({ submissionId, onBack }) {
  const fetchSubmission = useCallback(() => submissionsService.getById(submissionId), [submissionId])
  const { data: subData, loading } = useFetch(fetchSubmission)
  const submission = subData?.data || subData

  if (loading) return <LoadingSpinner message="Đang tải kết quả..." />
  if (!submission) return <div className="text-center py-12 text-gray-400">Không tìm thấy bài nộp</div>

  const isGraded = submission.status === 'graded'
  const isPending = submission.status === 'submitted'
  const scorePercent = submission.total_points ? Math.round((submission.score / submission.total_points) * 100) : null
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

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> Quay lại
      </button>

      {/* Score card */}
      <div className={`rounded-2xl border shadow-sm p-6 mb-6 ${isGraded ? 'bg-white' : 'bg-amber-50 border-amber-200'}`}>
        {isGraded && scorePercent !== null ? (
          <div className="text-center">
            <div className="text-5xl mb-2">{getGrade(scorePercent).emoji}</div>
            <h2 className="text-3xl font-bold text-gray-900">
              {submission.score} <span className="text-lg text-gray-400">/ {submission.total_points}</span>
            </h2>
            <div className={`inline-block mt-2 px-4 py-1 rounded-full text-sm font-semibold ${getGrade(scorePercent).bg} ${getGrade(scorePercent).color}`}>
              {scorePercent}% — {getGrade(scorePercent).label}
            </div>
            <div className="flex justify-center gap-6 mt-4 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {formatTime(timeSpent)}</span>
              <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500" /> {answers.filter(a => a.is_correct).length} đúng</span>
              <span className="flex items-center gap-1"><XCircle className="h-4 w-4 text-red-500" /> {answers.filter(a => a.is_correct === false).length} sai</span>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-2" />
            <h2 className="text-xl font-bold text-amber-700">Đã nộp bài — Chờ chấm điểm</h2>
            <p className="text-sm text-amber-600 mt-1">Giáo viên sẽ chấm phần tự luận. Bạn sẽ thấy điểm khi hoàn tất.</p>
            {submission.auto_score > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Điểm trắc nghiệm (tự chấm): <strong>{submission.auto_score}</strong>
              </p>
            )}
          </div>
        )}

        {submission.feedback && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <strong>Nhận xét:</strong> {submission.feedback}
            </p>
          </div>
        )}
      </div>

      {/* Answers review */}
      <h3 className="text-lg font-bold text-gray-900 mb-4">Chi tiết câu trả lời</h3>
      <div className="space-y-4">
        {answers.map((answer, idx) => {
          const q = answer.question || {}
          const isMCQ = q.question_type === 'multiple_choice'
          const opts = q.options || []

          return (
            <div key={answer.id || idx} className={`rounded-xl border p-5 ${
              answer.is_correct === true ? 'border-green-200 bg-green-50/30' :
              answer.is_correct === false ? 'border-red-200 bg-red-50/30' :
              'border-gray-200 bg-white'
            }`}>
              {/* Question header */}
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-medium text-gray-900 flex-1">
                  <span className="text-gray-400 mr-2">Câu {idx + 1}.</span>
                  {q.question_text || '—'}
                </p>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  {answer.score !== null && answer.score !== undefined && (
                    <span className={`text-sm font-bold ${answer.is_correct ? 'text-green-600' : answer.is_correct === false ? 'text-red-600' : 'text-gray-500'}`}>
                      {answer.score}/{q.points || 0}
                    </span>
                  )}
                  {answer.is_correct === true && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {answer.is_correct === false && <XCircle className="h-5 w-5 text-red-500" />}
                  {answer.is_correct === null && <Circle className="h-5 w-5 text-gray-300" />}
                </div>
              </div>

              {/* MCQ options */}
              {isMCQ && (
                <div className="space-y-2 mb-3">
                  {opts.map((opt, oi) => {
                    const isSelected = answer.selected_option_index === oi
                    const isCorrectOpt = opt.is_correct === true

                    return (
                      <div key={oi} className={`flex items-center gap-2 p-2.5 rounded-lg text-sm ${
                        isSelected && isCorrectOpt ? 'bg-green-100 text-green-800' :
                        isSelected && !isCorrectOpt ? 'bg-red-100 text-red-800' :
                        isCorrectOpt ? 'bg-green-50 text-green-700' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isSelected ? (isCorrectOpt ? 'bg-green-500 text-white' : 'bg-red-500 text-white') :
                          isCorrectOpt ? 'bg-green-200 text-green-700' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {String.fromCharCode(65 + oi)}
                        </div>
                        <span>{opt.text}</span>
                        {isSelected && <span className="text-xs ml-auto">← Bạn chọn</span>}
                        {isCorrectOpt && !isSelected && <span className="text-xs ml-auto text-green-600">← Đáp án đúng</span>}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Essay answer */}
              {!isMCQ && answer.answer_text && (
                <div className="bg-white rounded-lg border border-gray-200 p-3 mb-3">
                  <p className="text-xs text-gray-400 mb-1">Câu trả lời:</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{answer.answer_text}</p>
                </div>
              )}

              {/* Answer feedback */}
              {answer.feedback && (
                <div className="flex items-start gap-2 mt-2 p-2.5 bg-blue-50 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700">{answer.feedback}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

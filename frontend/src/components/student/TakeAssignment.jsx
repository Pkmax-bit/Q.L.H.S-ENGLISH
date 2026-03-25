import { useState, useEffect, useContext, useCallback, useMemo } from 'react'
import {
  ArrowLeft, Clock, CheckCircle, AlertTriangle, Send,
  ChevronLeft, ChevronRight, Circle, CircleDot, FileText
} from 'lucide-react'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import RichContentViewer from '../common/RichContentViewer'
import { ToastContext } from '../../context/ToastContext'
import { useFetch } from '../../hooks/useFetch'
import submissionsService from '../../services/submissions.service'
import assignmentsService from '../../services/assignments.service'

export default function TakeAssignment({ assignmentId, onBack, onComplete }) {
  const [submission, setSubmission] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({}) // { questionId: { answer_text, selected_option_index } }
  const [currentQ, setCurrentQ] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null) // seconds
  const { success, error: showError } = useContext(ToastContext)

  // Load assignment + questions + start submission
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        // Get assignment details with questions
        const aRes = await assignmentsService.getById(assignmentId)
        const assignment = aRes.data || aRes
        const qs = assignment.questions || assignment.assignment_questions || []
        setQuestions(qs.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)))

        // Set timer if time limit
        if (assignment.time_limit_minutes) {
          setTimeLeft(assignment.time_limit_minutes * 60)
        }

        // Start submission
        const sRes = await submissionsService.start({ assignment_id: assignmentId })
        const sub = sRes.data || sRes
        setSubmission(sub)
      } catch (err) {
        showError(err.response?.data?.message || 'Không thể bắt đầu bài tập')
        onBack?.()
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [assignmentId])

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          handleSubmit(true) // auto-submit on timeout
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [timeLeft !== null])

  const formatTimer = (seconds) => {
    if (seconds === null) return null
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const timerColor = timeLeft !== null && timeLeft <= 300
    ? 'text-red-600 bg-red-50'
    : timeLeft !== null && timeLeft <= 600
      ? 'text-amber-600 bg-amber-50'
      : 'text-gray-600 bg-gray-50'

  const updateAnswer = (questionId, field, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...(prev[questionId] || {}), [field]: value },
    }))
  }

  const answeredCount = useMemo(() => {
    return questions.filter(q => {
      const a = answers[q.id]
      if (!a) return false
      if (q.question_type === 'multiple_choice') return a.selected_option_index !== undefined && a.selected_option_index !== null
      return a.answer_text && a.answer_text.trim().length > 0
    }).length
  }, [questions, answers])

  const handleSubmit = async (forced = false) => {
    if (!submission) return
    if (!forced && answeredCount < questions.length) {
      setShowConfirm(true)
      return
    }

    setSubmitting(true)
    try {
      const answerPayload = questions.map(q => ({
        question_id: q.id,
        answer_text: answers[q.id]?.answer_text || null,
        selected_option_index: answers[q.id]?.selected_option_index ?? null,
      }))

      const result = await submissionsService.submit(submission.id, { answers: answerPayload })
      success('Nộp bài thành công!')
      onComplete?.(result.data || result)
    } catch (err) {
      showError(err.response?.data?.message || 'Nộp bài thất bại')
    } finally {
      setSubmitting(false)
      setShowConfirm(false)
    }
  }

  if (loading) return <LoadingSpinner message="Đang tải bài tập..." />

  const currentQuestion = questions[currentQ]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </button>

          <div className="flex items-center gap-3">
            {/* Progress */}
            <span className="text-sm text-gray-500">
              {answeredCount}/{questions.length} câu
            </span>

            {/* Timer */}
            {timeLeft !== null && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono font-bold ${timerColor}`}>
                <Clock className="h-4 w-4" />
                {formatTimer(timeLeft)}
              </div>
            )}

            {/* Submit button */}
            <Button
              variant="success"
              icon={Send}
              onClick={() => handleSubmit(false)}
              loading={submitting}
              size="sm"
            >
              Nộp bài
            </Button>
          </div>
        </div>

        {/* Question navigation dots */}
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {questions.map((q, idx) => {
            const isAnswered = !!answers[q.id] && (
              q.question_type === 'multiple_choice'
                ? answers[q.id].selected_option_index !== undefined && answers[q.id].selected_option_index !== null
                : answers[q.id].answer_text?.trim()
            )
            const isCurrent = idx === currentQ

            return (
              <button
                key={q.id}
                onClick={() => setCurrentQ(idx)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-md scale-110'
                    : isAnswered
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {idx + 1}
              </button>
            )
          })}
        </div>
      </div>

      {/* Question content */}
      {currentQuestion && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-blue-600">
              Câu {currentQ + 1} / {questions.length}
            </span>
            <span className="text-xs text-gray-400">
              {currentQuestion.points || 0} điểm •{' '}
              {currentQuestion.question_type === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'}
            </span>
          </div>

          {/* Question text */}
          <div className="mb-6">
            <p className="text-base font-medium text-gray-900 leading-relaxed">
              {currentQuestion.question_text || currentQuestion.text || '(Câu hỏi)'}
            </p>

            {/* File/YouTube in question */}
            {currentQuestion.file_url && (
              <a href={currentQuestion.file_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-sm text-blue-600 hover:text-blue-800">
                <FileText className="h-4 w-4" /> Tệp đính kèm
              </a>
            )}
          </div>

          {/* Answer area */}
          {currentQuestion.question_type === 'multiple_choice' ? (
            <div className="space-y-3">
              {(currentQuestion.options || []).map((opt, optIdx) => {
                const isSelected = answers[currentQuestion.id]?.selected_option_index === optIdx
                return (
                  <button
                    key={optIdx}
                    onClick={() => updateAnswer(currentQuestion.id, 'selected_option_index', optIdx)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {String.fromCharCode(65 + optIdx)}
                    </div>
                    <span className={`text-sm ${isSelected ? 'text-blue-800 font-medium' : 'text-gray-700'}`}>
                      {opt.text || `Đáp án ${String.fromCharCode(65 + optIdx)}`}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div>
              <textarea
                value={answers[currentQuestion.id]?.answer_text || ''}
                onChange={(e) => updateAnswer(currentQuestion.id, 'answer_text', e.target.value)}
                placeholder="Nhập câu trả lời của bạn..."
                rows={8}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm resize-y transition-colors"
              />
              <p className="text-xs text-gray-400 mt-1">
                {(answers[currentQuestion.id]?.answer_text || '').length} ký tự
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              icon={ChevronLeft}
              onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
              disabled={currentQ === 0}
              size="sm"
            >
              Câu trước
            </Button>

            {currentQ < questions.length - 1 ? (
              <Button
                icon={ChevronRight}
                onClick={() => setCurrentQ(currentQ + 1)}
                size="sm"
              >
                Câu sau
              </Button>
            ) : (
              <Button
                variant="success"
                icon={Send}
                onClick={() => handleSubmit(false)}
                loading={submitting}
                size="sm"
              >
                Nộp bài
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <div>
                <h3 className="text-lg font-bold text-gray-900">Xác nhận nộp bài?</h3>
                <p className="text-sm text-gray-500">
                  Bạn đã trả lời {answeredCount}/{questions.length} câu.
                  {answeredCount < questions.length && (
                    <span className="text-amber-600 font-medium"> Còn {questions.length - answeredCount} câu chưa làm.</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowConfirm(false)}>Tiếp tục làm</Button>
              <Button variant="success" icon={Send} onClick={() => handleSubmit(true)} loading={submitting}>
                Nộp bài
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

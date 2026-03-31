import { useState, useEffect, useContext, useMemo, useRef, useCallback } from 'react'
import {
  ArrowLeft, Clock, CheckCircle, AlertTriangle, Send,
  ChevronLeft, ChevronRight, FileText, HelpCircle
} from 'lucide-react'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import RichContentViewer from '../common/RichContentViewer'
import { ToastContext } from '../../context/ToastContext'
import submissionsService from '../../services/submissions.service'
import assignmentsService from '../../services/assignments.service'

export default function TakeAssignment({ assignmentId, onBack, onComplete }) {
  const [assignment, setAssignment] = useState(null)
  const [submission, setSubmission] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({}) // { questionId: { answer_text, selected_option_index } }
  const [currentQ, setCurrentQ] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)
  const [error, setError] = useState(null)
  const { success, error: showError } = useContext(ToastContext)

  // Load assignment + start submission
  useEffect(() => {
    let cancelled = false
    const init = async () => {
      setLoading(true)
      setError(null)
      try {
        // 1. Get assignment details with questions
        const aRes = await assignmentsService.getById(assignmentId)
        const assignmentData = aRes.data?.data ?? aRes.data ?? aRes
        if (cancelled) return

        setAssignment(assignmentData)
        const qs = assignmentData.questions || assignmentData.assignment_questions || []
        const sortedQs = [...qs].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        setQuestions(sortedQs)

        if (sortedQs.length === 0) {
          setError('Bài tập này chưa có câu hỏi nào.')
          setLoading(false)
          return
        }

        // 2. Set timer
        if (assignmentData.time_limit_minutes) {
          setTimeLeft(assignmentData.time_limit_minutes * 60)
        }

        // 3. Start submission
        const sRes = await submissionsService.start({ assignment_id: assignmentId })
        const subData = sRes.data?.data ?? sRes.data ?? sRes
        if (cancelled) return
        setSubmission(subData)

        // 4a. Restore draft answers from localStorage
        const draftKey = `draft_answers_${subData.id}`
        try {
          const saved = localStorage.getItem(draftKey)
          if (saved) setAnswers(JSON.parse(saved))
        } catch {}

        // 4b. If resuming, recalculate timer
        if (subData.started_at && assignmentData.time_limit_minutes) {
          const elapsed = Math.floor((Date.now() - new Date(subData.started_at).getTime()) / 1000)
          const remaining = assignmentData.time_limit_minutes * 60 - elapsed
          setTimeLeft(Math.max(0, remaining))
        }
      } catch (err) {
        if (cancelled) return
        const msg = err.response?.data?.message || 'Không thể bắt đầu bài tập'
        if (err.response?.status === 409) {
          // Already submitted - show message
          setError('Bạn đã nộp bài này rồi.')
        } else {
          setError(msg)
          showError(msg)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [assignmentId])

  // Save answers to localStorage on change
  useEffect(() => {
    if (!submission?.id || Object.keys(answers).length === 0) return
    try {
      localStorage.setItem(`draft_answers_${submission.id}`, JSON.stringify(answers))
    } catch {}
  }, [answers, submission?.id])

  // Scroll to top when switching questions
  const questionRef = useRef(null)
  useEffect(() => {
    questionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [currentQ])

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          handleAutoSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [timeLeft !== null]) // eslint-disable-line

  const handleAutoSubmit = () => {
    handleSubmit(true)
  }

  const formatTimer = (seconds) => {
    if (seconds === null) return null
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const timerColor = timeLeft !== null && timeLeft <= 60
    ? 'text-red-600 bg-red-100 animate-pulse'
    : timeLeft !== null && timeLeft <= 300
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
      const resultData = result.data?.data ?? result.data ?? result
      // Clear draft from localStorage
      try { localStorage.removeItem(`draft_answers_${submission.id}`) } catch {}
      success('🎉 Nộp bài thành công!')
      onComplete?.({ id: resultData.id || submission.id, ...resultData })
    } catch (err) {
      showError(err.response?.data?.message || 'Nộp bài thất bại')
    } finally {
      setSubmitting(false)
      setShowConfirm(false)
    }
  }

  if (loading) return <LoadingSpinner message="Đang tải bài tập..." />

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <AlertTriangle className="h-16 w-16 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">{error}</h2>
        <Button variant="outline" icon={ArrowLeft} onClick={onBack} className="mt-4">
          Quay lại
        </Button>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <HelpCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Bài tập chưa có câu hỏi</h2>
        <p className="text-sm text-gray-500 mb-4">Giáo viên chưa thêm câu hỏi cho bài tập này.</p>
        <Button variant="outline" icon={ArrowLeft} onClick={onBack}>Quay lại</Button>
      </div>
    )
  }

  const currentQuestion = questions[currentQ]
  const qText = currentQuestion?.question_text || currentQuestion?.text || '(Câu hỏi)'

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4" /> Quay lại
            </button>
            {assignment && (
              <h2 className="text-sm font-semibold text-gray-700 hidden sm:block">{assignment.title}</h2>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Progress */}
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>{answeredCount}/{questions.length}</span>
            </div>

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
            const a = answers[q.id]
            const isAnswered = a && (
              q.question_type === 'multiple_choice'
                ? a.selected_option_index !== undefined && a.selected_option_index !== null
                : a.answer_text?.trim()
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
                title={`Câu ${idx + 1}${isAnswered ? ' (đã trả lời)' : ''}`}
              >
                {idx + 1}
              </button>
            )
          })}
        </div>
      </div>

      {/* Question content */}
      {currentQuestion && (
        <div ref={questionRef} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-blue-600">
              Câu {currentQ + 1} / {questions.length}
            </span>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{currentQuestion.points || 0} điểm</span>
              <span>•</span>
              <span>{currentQuestion.question_type === 'multiple_choice' ? '🔘 Trắc nghiệm' : '✍️ Tự luận'}</span>
            </div>
          </div>

          {/* Question text */}
          <div className="mb-6">
            {currentQuestion.question_text && currentQuestion.question_text.includes('<') ? (
              <RichContentViewer content={currentQuestion.question_text} />
            ) : (
              <p className="text-base font-medium text-gray-900 leading-relaxed whitespace-pre-wrap">
                {qText}
              </p>
            )}

            {/* File attachment */}
            {currentQuestion.file_url && (
              <a href={currentQuestion.file_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg">
                <FileText className="h-4 w-4" /> Xem tệp đính kèm
              </a>
            )}

            {/* YouTube */}
            {currentQuestion.youtube_url && (
              <div className="mt-3">
                <a href={currentQuestion.youtube_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800 bg-red-50 px-3 py-1.5 rounded-lg">
                  📺 Xem video
                </a>
              </div>
            )}
          </div>

          {/* Answer area */}
          {currentQuestion.question_type === 'multiple_choice' ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-1">Chọn đáp án đúng:</p>
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
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {String.fromCharCode(65 + optIdx)}
                    </div>
                    <span className={`text-sm flex-1 ${isSelected ? 'text-blue-800 font-medium' : 'text-gray-700'}`}>
                      {opt.text || `Đáp án ${String.fromCharCode(65 + optIdx)}`}
                    </span>
                    {isSelected && (
                      <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-500 mb-2">Nhập câu trả lời:</p>
              <textarea
                value={answers[currentQuestion.id]?.answer_text || ''}
                onChange={(e) => updateAnswer(currentQuestion.id, 'answer_text', e.target.value)}
                placeholder="Nhập câu trả lời của bạn tại đây..."
                rows={10}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm resize-y transition-colors"
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-gray-400">
                  {(answers[currentQuestion.id]?.answer_text || '').length} ký tự
                </p>
                {answers[currentQuestion.id]?.answer_text?.trim() && (
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Đã trả lời
                  </p>
                )}
              </div>
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

            <span className="text-xs text-gray-400">
              {answeredCount}/{questions.length} đã trả lời
            </span>

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

      {/* Summary before submit */}
      {currentQ === questions.length - 1 && answeredCount === questions.length && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-green-700">Bạn đã trả lời hết tất cả câu hỏi!</p>
          <p className="text-xs text-green-600 mt-1">Nhấn "Nộp bài" khi bạn đã kiểm tra xong.</p>
        </div>
      )}

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Xác nhận nộp bài?</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Bạn đã trả lời <strong className="text-green-600">{answeredCount}</strong>/{questions.length} câu.
                  {answeredCount < questions.length && (
                    <span className="text-amber-600 font-medium"> Còn {questions.length - answeredCount} câu chưa trả lời.</span>
                  )}
                </p>
              </div>
            </div>

            {/* Show unanswered questions */}
            {answeredCount < questions.length && (
              <div className="mb-4 p-3 bg-amber-50 rounded-lg">
                <p className="text-xs font-medium text-amber-700 mb-1">Câu chưa trả lời:</p>
                <div className="flex flex-wrap gap-1.5">
                  {questions.map((q, idx) => {
                    const a = answers[q.id]
                    const isAnswered = a && (
                      q.question_type === 'multiple_choice'
                        ? a.selected_option_index !== undefined && a.selected_option_index !== null
                        : a.answer_text?.trim()
                    )
                    if (isAnswered) return null
                    return (
                      <button
                        key={q.id}
                        onClick={() => { setShowConfirm(false); setCurrentQ(idx) }}
                        className="w-7 h-7 rounded bg-amber-200 text-amber-800 text-xs font-medium hover:bg-amber-300 transition-colors"
                      >
                        {idx + 1}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowConfirm(false)}>
                Tiếp tục làm
              </Button>
              <Button variant="success" icon={Send} onClick={() => handleSubmit(true)} loading={submitting}>
                Nộp bài ngay
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

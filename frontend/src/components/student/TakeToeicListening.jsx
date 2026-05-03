import { useState, useEffect, useContext, useMemo, useRef, useCallback } from 'react'
import {
  ArrowLeft, Clock, CheckCircle, AlertTriangle, Send,
  ChevronLeft, ChevronRight, Headphones, Image as ImageIcon,
} from 'lucide-react'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import RichContentViewer from '../common/RichContentViewer'
import { ToastContext } from '../../context/ToastContext'
import submissionsService from '../../services/submissions.service'
import assignmentsService from '../../services/assignments.service'
import { unwrapApiPayload, normalizeMcqOptions, mcqLetter } from '../../utils/assignmentHelpers'
import {
  getToeicListeningMeta,
  isDirectAudioUrl,
  TOEIC_PART_RANGES,
  TOEIC_FULL_QUESTIONS,
} from '../../utils/toeicListening'
import { mediaFileNameFromUrl } from '../../utils/mediaUrl'

function pickGroupAudioUrl(questions, part, groupIndex) {
  if (part !== 3 && part !== 4) return null
  const base = part === 3 ? 31 : 70
  for (let k = 0; k < 3; k++) {
    const q = questions[base + groupIndex * 3 + k]
    const u = q?.youtube_url?.trim()
    if (u) return u
  }
  return null
}

export default function TakeToeicListening({ assignmentId, onBack, onComplete }) {
  const [assignment, setAssignment] = useState(null)
  const [submission, setSubmission] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [currentQ, setCurrentQ] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)
  const [error, setError] = useState(null)
  const { success, error: showError } = useContext(ToastContext)
  useEffect(() => {
    let cancelled = false
    const init = async () => {
      setLoading(true)
      setError(null)
      try {
        const aRes = await assignmentsService.getById(assignmentId)
        const assignmentData = unwrapApiPayload(aRes)
        if (cancelled) return

        if (!assignmentData?.id) {
          setError('Không tải được nội dung bài tập. Hãy đăng nhập lại hoặc tải lại trang.')
          return
        }

        setAssignment(assignmentData)
        const qs = assignmentData.questions || assignmentData.assignment_questions || []
        const sortedQs = [...qs].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        setQuestions(sortedQs)

        if (sortedQs.length === 0) {
          setError('Bài thi chưa có câu hỏi nào.')
          setLoading(false)
          return
        }

        if (assignmentData.time_limit_minutes) {
          setTimeLeft(assignmentData.time_limit_minutes * 60)
        }

        const sRes = await submissionsService.start({ assignment_id: assignmentId })
        const subData = unwrapApiPayload(sRes)
        if (cancelled) return
        if (!subData?.id) {
          setError('Không thể bắt đầu bài làm. Thử lại sau.')
          return
        }
        setSubmission(subData)

        const draftKey = `draft_answers_${subData.id}`
        try {
          const saved = localStorage.getItem(draftKey)
          if (saved) setAnswers(JSON.parse(saved))
        } catch {}

        if (subData.started_at && assignmentData.time_limit_minutes) {
          const elapsed = Math.floor((Date.now() - new Date(subData.started_at).getTime()) / 1000)
          const remaining = assignmentData.time_limit_minutes * 60 - elapsed
          setTimeLeft(Math.max(0, remaining))
        }
      } catch (err) {
        if (cancelled) return
        const msg = err.response?.data?.message || 'Không thể bắt đầu bài thi'
        if (err.response?.status === 409) {
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

  useEffect(() => {
    if (!submission?.id || Object.keys(answers).length === 0) return
    try {
      localStorage.setItem(`draft_answers_${submission.id}`, JSON.stringify(answers))
    } catch {}
  }, [answers, submission?.id])

  const questionRef = useRef(null)
  useEffect(() => {
    questionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [currentQ])

  const handleSubmit = useCallback(async (forced = false) => {
    if (!submission) return
    const ac = questions.filter(q => {
      const a = answers[q.id]
      return a?.selected_option_index !== undefined && a?.selected_option_index !== null
    }).length
    if (!forced && ac < questions.length) {
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
      try { localStorage.removeItem(`draft_answers_${submission.id}`) } catch {}
      success('Đã nộp bài thành công!')
      onComplete?.({ id: resultData.id || submission.id, ...resultData })
    } catch (err) {
      showError(err.response?.data?.message || 'Nộp bài thất bại')
    } finally {
      setSubmitting(false)
      setShowConfirm(false)
    }
  }, [submission, questions, answers, success, showError, onComplete])

  const handleSubmitRef = useRef(async (_forced) => {})

  useEffect(() => {
    handleSubmitRef.current = handleSubmit
  }, [handleSubmit])

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          void handleSubmitRef.current?.(true)
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
      return a?.selected_option_index !== undefined && a?.selected_option_index !== null
    }).length
  }, [questions, answers])

  const currentQuestion = questions[currentQ]
  const meta = useMemo(() => getToeicListeningMeta(currentQ), [currentQ])

  const groupAudioUrl = useMemo(() => {
    if (!currentQuestion || (meta.part !== 3 && meta.part !== 4)) return null
    return pickGroupAudioUrl(questions, meta.part, meta.groupIndex)
  }, [questions, currentQuestion, meta.part, meta.groupIndex])

  const singleAudioUrl = currentQuestion?.youtube_url?.trim() || null

  if (loading) return <LoadingSpinner message="Đang tải nội dung bài thi..." />

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
        <Headphones className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Chưa có câu hỏi</h2>
        <Button variant="outline" icon={ArrowLeft} onClick={onBack}>Quay lại</Button>
      </div>
    )
  }

  const qText = currentQuestion?.question_text || currentQuestion?.text || ''
  const opts = normalizeMcqOptions(currentQuestion?.options)
  const showPartHeader = currentQ === 0 || getToeicListeningMeta(currentQ - 1).part !== meta.part

  const structureNote = questions.length !== TOEIC_FULL_QUESTIONS
    ? ` (${questions.length} câu — khuyến nghị ${TOEIC_FULL_QUESTIONS} câu)`
    : ''

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4" /> Quay lại
            </button>
            {assignment && (
              <div>
                <h2 className="text-sm font-semibold text-gray-900">{assignment.title}</h2>
                <p className="text-xs text-gray-500">TOEIC Listening · 100 câu · ~45 phút · Thang 5–495{structureNote}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>{answeredCount}/{questions.length}</span>
            </div>

            {timeLeft !== null && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono font-bold ${timerColor}`}>
                <Clock className="h-4 w-4" />
                {formatTimer(timeLeft)}
              </div>
            )}

            <Button variant="success" icon={Send} onClick={() => handleSubmit(false)} loading={submitting} size="sm">
              Nộp bài
            </Button>
          </div>
        </div>

        <div className="flex gap-1.5 mt-3 flex-wrap">
          {questions.map((q, idx) => {
            const a = answers[q.id]
            const isAnswered = a?.selected_option_index !== undefined && a?.selected_option_index !== null
            const isCurrent = idx === currentQ
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentQ(idx)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-md scale-110'
                    : isAnswered
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                title={`Câu ${idx + 1}`}
              >
                {idx + 1}
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-lg border border-amber-100 bg-amber-50/90 px-3 py-2 mb-4 text-xs text-amber-950 leading-relaxed">
        <strong className="font-semibold text-amber-900">Thời gian:</strong>{' '}
        {timeLeft !== null ? (
          <>
            Đồng hồ trên đếm ngược cho <strong>cả bài nghe</strong> (theo phút giới hạn của đề). Thời gian{' '}
            <strong>chạy liên tục</strong> khi bạn chuyển câu; <strong>không có</strong> khoảng nghỉ riêng sau mỗi audio
            như thi TOEIC trên giấy — hãy chọn đáp án trong thời gian còn lại.
          </>
        ) : (
          <>Bài này <strong>không giới hạn phút</strong> (giáo viên chưa đặt thời gian làm bài).</>
        )}
      </div>

      {assignment?.description && String(assignment.description).trim() && (
        <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-blue-900 mb-2 uppercase tracking-wide">Nội dung / hướng dẫn</p>
          <RichContentViewer content={assignment.description} />
        </div>
      )}

      <div ref={questionRef} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        {showPartHeader && (
          <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3">
            <p className="text-sm font-bold text-indigo-900">
              {TOEIC_PART_RANGES.find(r => r.part === meta.part)?.label || meta.label}
            </p>
            <p className="text-xs text-indigo-700 mt-1">
              {TOEIC_PART_RANGES.find(r => r.part === meta.part)?.note}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-semibold text-indigo-600">
            Câu {currentQ + 1} / {questions.length}
            {meta.part && (meta.part === 3 || meta.part === 4) && (
              <span className="text-gray-500 font-normal ml-2">
                · {meta.part === 3 ? 'Hội thoại' : 'Bài nói'} { (meta.groupIndex ?? 0) + 1}
                {meta.indexInGroup != null ? ` — câu ${meta.indexInGroup + 1}/3` : ''}
              </span>
            )}
          </span>
        </div>

        {(meta.part === 3 || meta.part === 4) && groupAudioUrl && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-2">
              <Headphones className="h-4 w-4 text-indigo-600" />
              Audio đoạn
            </div>
            <p className="text-xs text-gray-600 mb-2 break-all">
              <span className="text-gray-500">Tên file / nguồn:</span>{' '}
              <span className="font-medium text-gray-800">{mediaFileNameFromUrl(groupAudioUrl)}</span>
            </p>
            {isDirectAudioUrl(groupAudioUrl) ? (
              <audio key={groupAudioUrl} controls className="w-full" preload="metadata" src={groupAudioUrl}>
                <track kind="captions" />
              </audio>
            ) : (
              <a
                href={groupAudioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 underline"
              >
                Mở file / liên kết âm thanh
              </a>
            )}
          </div>
        )}

        {meta.part === 1 && singleAudioUrl && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-2">
              <Headphones className="h-4 w-4 text-indigo-600" />
              Audio câu hỏi
            </div>
            <p className="text-xs text-gray-600 mb-2 break-all">
              <span className="text-gray-500">Tên file / nguồn:</span>{' '}
              <span className="font-medium text-gray-800">{mediaFileNameFromUrl(singleAudioUrl)}</span>
            </p>
            {isDirectAudioUrl(singleAudioUrl) ? (
              <audio controls className="w-full" preload="metadata" src={singleAudioUrl} />
            ) : (
              <a href={singleAudioUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">
                Mở liên kết âm thanh
              </a>
            )}
          </div>
        )}

        {meta.part === 1 && currentQuestion.file_url && (
          <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-100">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-100 text-sm text-gray-700">
              <ImageIcon className="h-4 w-4" /> Hình ảnh
            </div>
            <p className="px-3 py-2 text-xs bg-white border-b border-gray-100 text-gray-700 break-all">
              <span className="text-gray-500">Tên file:</span>{' '}
              <span className="font-medium">{mediaFileNameFromUrl(currentQuestion.file_url)}</span>
            </p>
            <img
              src={currentQuestion.file_url}
              alt={`TOEIC Part 1 — câu ${currentQ + 1}`}
              className="w-full max-h-[360px] object-contain mx-auto block"
            />
          </div>
        )}

        {meta.part === 2 && singleAudioUrl && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-2">
              <Headphones className="h-4 w-4 text-indigo-600" />
              Audio
            </div>
            <p className="text-xs text-gray-600 mb-2 break-all">
              <span className="text-gray-500">Tên file / nguồn:</span>{' '}
              <span className="font-medium text-gray-800">{mediaFileNameFromUrl(singleAudioUrl)}</span>
            </p>
            {isDirectAudioUrl(singleAudioUrl) ? (
              <audio controls className="w-full" preload="metadata" src={singleAudioUrl} />
            ) : (
              <a href={singleAudioUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">
                Mở liên kết âm thanh
              </a>
            )}
          </div>
        )}

        {qText && (
          <div className="text-gray-900">
            {qText.includes('<') ? (
              <RichContentViewer content={qText} />
            ) : (
              <p className="text-base whitespace-pre-wrap">{qText}</p>
            )}
          </div>
        )}

        <div className="space-y-3">
          <p className="text-xs text-gray-500">Chọn đáp án đúng:</p>
          {opts.map((opt, optIdx) => {
            const L = mcqLetter(optIdx)
            const isSelected = answers[currentQuestion.id]?.selected_option_index === optIdx
            return (
              <button
                key={optIdx}
                type="button"
                onClick={() => updateAnswer(currentQuestion.id, 'selected_option_index', optIdx)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 shadow-md'
                    : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {L}
                </div>
                <span className={`text-sm flex-1 ${isSelected ? 'text-indigo-900 font-medium' : 'text-gray-700'}`}>
                  {opt.text || `Lựa chọn ${L}`}
                </span>
                {isSelected && <CheckCircle className="h-5 w-5 text-indigo-500 flex-shrink-0" />}
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <Button variant="outline" icon={ChevronLeft} onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0} size="sm">
            Trước
          </Button>
          <span className="text-xs text-gray-400">{answeredCount}/{questions.length} đã chọn</span>
          {currentQ < questions.length - 1 ? (
            <Button icon={ChevronRight} onClick={() => setCurrentQ(currentQ + 1)} size="sm">
              Sau
            </Button>
          ) : (
            <Button variant="success" icon={Send} onClick={() => handleSubmit(false)} loading={submitting} size="sm">
              Nộp bài
            </Button>
          )}
        </div>
      </div>

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
                  Đã chọn <strong className="text-green-600">{answeredCount}</strong>/{questions.length} câu.
                </p>
              </div>
            </div>

            {answeredCount < questions.length && (
              <div className="mb-4 p-3 bg-amber-50 rounded-lg">
                <p className="text-xs font-medium text-amber-700 mb-1">Câu chưa chọn:</p>
                <div className="flex flex-wrap gap-1.5">
                  {questions.map((q, idx) => {
                    const a = answers[q.id]
                    const ok = a?.selected_option_index !== undefined && a?.selected_option_index !== null
                    if (ok) return null
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => { setShowConfirm(false); setCurrentQ(idx) }}
                        className="w-7 h-7 rounded bg-amber-200 text-amber-800 text-xs font-medium hover:bg-amber-300"
                      >
                        {idx + 1}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowConfirm(false)}>Tiếp tục</Button>
              <Button variant="success" icon={Send} onClick={() => handleSubmit(true)} loading={submitting}>
                Nộp ngay
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useContext, useMemo, useRef, useCallback } from 'react'
import {
  ArrowLeft, Clock, CheckCircle, AlertTriangle, Send,
  ChevronLeft, ChevronRight, FileText, HelpCircle,
  Headphones, Image as ImageIcon,
  List, ChevronDown, ChevronUp,
} from 'lucide-react'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import RichContentViewer from '../common/RichContentViewer'
import YoutubeEmbed from '../common/YoutubeEmbed'
import { ToastContext } from '../../context/ToastContext'
import submissionsService from '../../services/submissions.service'
import assignmentsService from '../../services/assignments.service'
import {
  getToeicListeningMeta,
  isDirectAudioUrl,
  pickGroupAudioUrl,
  TOEIC_PART_RANGES,
} from '../../utils/toeicListening'
import { getToeicReadingMeta, READING_PART_RANGES } from '../../utils/toeicReading'
import {
  ASSIGNMENT_TYPE_TOEIC_LR,
  ASSIGNMENT_TYPE_TOEIC_FOUR_SKILLS,
  TOEIC_LISTENING_COUNT,
  TOEIC_LR_TOTAL,
  TOEIC_SPEAKING_COUNT,
  TOEIC_WRITING_COUNT,
} from '../../utils/toeicExamConfig'
import { mediaFileNameFromUrl } from '../../utils/mediaUrl'

function rangeInclusive(start, end) {
  if (start > end) return []
  const out = []
  for (let i = start; i <= end; i++) out.push(i)
  return out
}

/** Nhóm chỉ số câu (0-based) theo Part TOEIC để hiển thị trong sidebar */
function buildQuestionPartGroups(assignmentType, total) {
  if (total === 0) return []
  if (assignmentType === 'toeic_listening') {
    return TOEIC_PART_RANGES.map((r) => {
      const end = Math.min(r.end, total - 1)
      if (r.start > end) return null
      return {
        key: `L${r.part}`,
        label: r.label,
        indices: rangeInclusive(r.start, end),
      }
    }).filter(Boolean)
  }
  if (assignmentType === ASSIGNMENT_TYPE_TOEIC_LR || assignmentType === ASSIGNMENT_TYPE_TOEIC_FOUR_SKILLS) {
    const groups = []
    const L = Math.min(TOEIC_LISTENING_COUNT, total)
    for (const r of TOEIC_PART_RANGES) {
      const end = Math.min(r.end, L - 1)
      if (r.start >= L) continue
      groups.push({
        key: `Lp${r.part}`,
        label: `Nghe — ${r.label}`,
        indices: rangeInclusive(r.start, end),
      })
    }
    if (total > TOEIC_LISTENING_COUNT) {
      for (const r of READING_PART_RANGES) {
        const absStart = TOEIC_LISTENING_COUNT + r.start
        const absEnd = Math.min(TOEIC_LISTENING_COUNT + r.end, total - 1)
        if (absStart > absEnd || absStart >= total) continue
        groups.push({
          key: `Rp${r.part}`,
          label: `Đọc — ${r.label}`,
          indices: rangeInclusive(absStart, absEnd),
        })
      }
    }
    if (assignmentType === ASSIGNMENT_TYPE_TOEIC_FOUR_SKILLS && total > TOEIC_LR_TOTAL) {
      const spEnd = Math.min(TOEIC_LR_TOTAL + TOEIC_SPEAKING_COUNT - 1, total - 1)
      if (TOEIC_LR_TOTAL <= spEnd) {
        groups.push({
          key: 'speaking',
          label: `Speaking (${TOEIC_SPEAKING_COUNT} bài)`,
          indices: rangeInclusive(TOEIC_LR_TOTAL, spEnd),
        })
      }
      const wStart = TOEIC_LR_TOTAL + TOEIC_SPEAKING_COUNT
      if (total > wStart) {
        groups.push({
          key: 'writing',
          label: `Writing (${TOEIC_WRITING_COUNT} bài)`,
          indices: rangeInclusive(wStart, total - 1),
        })
      }
    }
    return groups.length > 0
      ? groups
      : [{ key: 'all', label: 'Tất cả câu', indices: rangeInclusive(0, total - 1) }]
  }
  return [{ key: 'all', label: 'Tất cả câu', indices: rangeInclusive(0, total - 1) }]
}

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
  /** Sidebar danh sách số câu — mặc định ẩn */
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { success, error: showError } = useContext(ToastContext)

  const assignmentType = assignment?.assignment_type
  const currentQuestionLive = questions[currentQ] ?? null

  const listeningMeta = useMemo(() => {
    if (!currentQuestionLive || questions.length === 0) return null
    const at = assignmentType
    if (
      at === 'toeic_listening' ||
      ((at === ASSIGNMENT_TYPE_TOEIC_LR || at === ASSIGNMENT_TYPE_TOEIC_FOUR_SKILLS) &&
        currentQ < TOEIC_LISTENING_COUNT)
    ) {
      return getToeicListeningMeta(currentQ)
    }
    return null
  }, [assignmentType, currentQuestionLive, questions.length, currentQ])

  const readingMeta = useMemo(() => {
    if (!currentQuestionLive) return null
    const at = assignmentType
    if (
      (at === ASSIGNMENT_TYPE_TOEIC_LR || at === ASSIGNMENT_TYPE_TOEIC_FOUR_SKILLS) &&
      currentQ >= TOEIC_LISTENING_COUNT &&
      currentQ < TOEIC_LR_TOTAL
    ) {
      return getToeicReadingMeta(currentQ - TOEIC_LISTENING_COUNT)
    }
    return null
  }, [assignmentType, currentQuestionLive, currentQ])

  const groupAudioUrl = useMemo(() => {
    if (!listeningMeta || (listeningMeta.part !== 3 && listeningMeta.part !== 4)) return null
    return pickGroupAudioUrl(questions, listeningMeta.part, listeningMeta.groupIndex)
  }, [listeningMeta, questions])

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

  const questionPartGroups = useMemo(
    () => buildQuestionPartGroups(assignmentType, questions.length),
    [assignmentType, questions.length]
  )

  const handleSubmitRef = useRef(async (_forced) => {})

  const handleSubmit = useCallback(async (forced = false) => {
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
  }, [submission, questions, answers, answeredCount, success, showError, onComplete])

  useEffect(() => {
    handleSubmitRef.current = handleSubmit
  }, [handleSubmit])

  // Đếm ngược tổng — luôn gọi bản submit mới nhất khi hết giờ (tránh nộp thiếu đáp án do closure cũ)
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

  const questionNavButton = (idx) => {
    const q = questions[idx]
    if (!q) return null
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
        type="button"
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
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
        {/* Cột chính: đề / nội dung */}
        <div className="flex-1 min-w-0 space-y-4 order-2 lg:order-1">
      {listeningMeta && (
        <div className="rounded-lg border border-amber-100 bg-amber-50/90 px-3 py-2 mb-4 text-xs text-amber-950 leading-relaxed">
          <strong className="font-semibold text-amber-900">Phần Nghe:</strong> Đồng hồ (khi giáo viên đặt phút) đếm cho{' '}
          <strong>toàn bộ bài</strong>, chạy liên tục khi bạn chuyển câu.{' '}
          <strong>Không có</strong> khoảng dừng riêng sau từng file audio để điền đáp án (khác thi TOEIC trên giấy).
        </div>
      )}

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
              <span>
                {currentQuestion.question_type === 'multiple_choice'
                  ? '🔘 Trắc nghiệm'
                  : currentQuestion.question_type === 'toeic_speaking'
                    ? '🎤 Speaking'
                    : currentQuestion.question_type === 'toeic_writing'
                      ? '✍️ Writing'
                      : '✍️ Tự luận'}
              </span>
            </div>
          </div>

          {listeningMeta && (
            <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3 mb-4">
              <p className="text-sm font-bold text-indigo-900">
                {TOEIC_PART_RANGES.find((r) => r.part === listeningMeta.part)?.label || listeningMeta.label}
              </p>
              <p className="text-xs text-indigo-700 mt-1">
                {TOEIC_PART_RANGES.find((r) => r.part === listeningMeta.part)?.note}
              </p>
            </div>
          )}

          {readingMeta && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 mb-4">
              <p className="text-sm font-bold text-emerald-900">
                {READING_PART_RANGES.find((r) => r.part === readingMeta.part)?.label || readingMeta.label}
              </p>
              <p className="text-xs text-emerald-800 mt-1">
                {READING_PART_RANGES.find((r) => r.part === readingMeta.part)?.note}
              </p>
            </div>
          )}

          {/* Listening: nhóm audio Part 3–4 */}
          {listeningMeta && (listeningMeta.part === 3 || listeningMeta.part === 4) && groupAudioUrl && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-2">
                <Headphones className="h-4 w-4 text-indigo-600" />
                Audio đoạn
              </div>
              <p className="text-xs text-gray-600 mb-2 break-all">
                <span className="text-gray-500">Tên file / nguồn:</span>{' '}
                <span className="font-medium text-gray-800">{mediaFileNameFromUrl(groupAudioUrl)}</span>
              </p>
              {isDirectAudioUrl(groupAudioUrl) ? (
                <audio key={groupAudioUrl} controls className="w-full" preload="metadata" src={groupAudioUrl} />
              ) : (
                <a href={groupAudioUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">
                  Mở âm thanh
                </a>
              )}
            </div>
          )}

          {listeningMeta?.part === 1 && currentQuestion.file_url && (
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-100 mb-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-100 text-sm text-gray-700">
                <ImageIcon className="h-4 w-4" /> Hình ảnh (Part 1)
              </div>
              <p className="px-3 py-2 text-xs bg-white border-b border-gray-100 text-gray-700 break-all">
                <span className="text-gray-500">Tên file:</span>{' '}
                <span className="font-medium">{mediaFileNameFromUrl(currentQuestion.file_url)}</span>
              </p>
              <img
                src={currentQuestion.file_url}
                alt="Part 1"
                className="w-full max-h-[360px] object-contain mx-auto block"
              />
            </div>
          )}

          {/* Listening Part 1–2 / đơn lẻ: audio câu */}
          {listeningMeta &&
            (listeningMeta.part === 1 || listeningMeta.part === 2) &&
            currentQuestion.youtube_url?.trim() && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-2">
                  <Headphones className="h-4 w-4 text-indigo-600" />
                  {listeningMeta.part === 2 ? 'Audio (không hiển thị đề chữ)' : 'Audio'}
                </div>
                <p className="text-xs text-gray-600 mb-2 break-all">
                  <span className="text-gray-500">Tên file / nguồn:</span>{' '}
                  <span className="font-medium text-gray-800">{mediaFileNameFromUrl(currentQuestion.youtube_url)}</span>
                </p>
                {isDirectAudioUrl(currentQuestion.youtube_url) ? (
                  <audio controls className="w-full" preload="metadata" src={currentQuestion.youtube_url} />
                ) : (
                  <YoutubeEmbed
                    url={currentQuestion.youtube_url}
                    title={`${assignment?.title || 'Bài tập'} — câu ${currentQ + 1}`}
                  />
                )}
              </div>
            )}

          {/* Question text */}
          <div className="mb-6">
            {listeningMeta?.part === 2 ? (
              <p className="text-sm text-gray-600 italic">
                Part 2 — Nghe và chọn A / B / C (theo đặc tả TOEIC, không hiển thị nội dung chữ trên màn hình).
              </p>
            ) : currentQuestion.question_text && currentQuestion.question_text.includes('<') ? (
              <RichContentViewer content={currentQuestion.question_text} />
            ) : (
              <p className="text-base font-medium text-gray-900 leading-relaxed whitespace-pre-wrap">
                {qText}
              </p>
            )}

            {!listeningMeta && readingMeta?.part === 7 && currentQuestion.file_url && (
              <div className="mt-4 rounded-xl border overflow-hidden bg-gray-50">
                <p className="px-3 py-2 text-xs text-gray-700 bg-white border-b border-gray-100 break-all">
                  <span className="text-gray-500">Tên file ảnh:</span>{' '}
                  <span className="font-medium">{mediaFileNameFromUrl(currentQuestion.file_url)}</span>
                </p>
                <img
                  src={currentQuestion.file_url}
                  alt="Reading"
                  className="w-full max-h-[320px] object-contain mx-auto"
                />
              </div>
            )}

            {/* File attachment — không phải ảnh Part 1 / Reading P7 đã hiển thị */}
            {currentQuestion.file_url &&
              !(listeningMeta?.part === 1) &&
              !(readingMeta?.part === 7 && currentQuestion.file_url) && (
              <a
                href={currentQuestion.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-col items-start gap-0.5 mt-3 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg"
              >
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="h-4 w-4" /> Xem tệp đính kèm
                </span>
                <span className="text-xs text-gray-600 font-normal break-all max-w-full">
                  {mediaFileNameFromUrl(currentQuestion.file_url)}
                </span>
              </a>
            )}

            {/* Video / nhúng — toàn bộ Listening đã có khối audio riêng */}
            {currentQuestion.youtube_url && !listeningMeta && (
              <YoutubeEmbed
                url={currentQuestion.youtube_url}
                title={`${assignment?.title || 'Bài tập'} — câu ${currentQ + 1}`}
                className="mt-4"
              />
            )}
          </div>

          {/* Answer area */}
          {currentQuestion.question_type === 'multiple_choice' ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-1">Chọn đáp án đúng:</p>
              {(currentQuestion.options || []).map((opt, optIdx) => {
                const isSelected = answers[currentQuestion.id]?.selected_option_index === optIdx
                const hideChoiceText = listeningMeta?.part === 2
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
                      {hideChoiceText
                        ? '\u00a0'
                        : (opt.text || `Đáp án ${String.fromCharCode(65 + optIdx)}`)}
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
              {currentQuestion.toeic_meta && (
                <div className="mb-3 rounded-lg bg-violet-50 border border-violet-100 px-3 py-2 text-xs text-violet-900 space-y-1">
                  {currentQuestion.question_type === 'toeic_speaking' && (
                    <p>
                      Chuẩn bị: <strong>{currentQuestion.toeic_meta.prep_seconds}</strong>s · Trả lời:{' '}
                      <strong>{currentQuestion.toeic_meta.answer_seconds}</strong>s
                      {currentQuestion.toeic_meta.shared_stimulus ? (
                        <span className="block mt-1 text-violet-700">
                          Dùng chung tài liệu với các câu Speaking xung quanh (theo đề).
                        </span>
                      ) : null}
                    </p>
                  )}
                  {currentQuestion.question_type === 'toeic_writing' && (
                    <p>
                      Gợi ý thời gian: <strong>{currentQuestion.toeic_meta.time_minutes}</strong> phút
                      {Array.isArray(currentQuestion.toeic_meta.keywords) &&
                        currentQuestion.toeic_meta.keywords.length > 0 && (
                          <span className="block mt-1">
                            Từ khóa bắt buộc: {currentQuestion.toeic_meta.keywords.join(', ')}
                          </span>
                        )}
                    </p>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-500 mb-2">
                {currentQuestion.question_type === 'toeic_speaking'
                  ? 'Ghi âm / dán link file hoặc ghi chú (phiên bản đơn giản):'
                  : 'Nhập câu trả lời:'}
              </p>
              <textarea
                value={answers[currentQuestion.id]?.answer_text || ''}
                onChange={(e) => updateAnswer(currentQuestion.id, 'answer_text', e.target.value)}
                placeholder="Nhập câu trả lời của bạn tại đây..."
                rows={currentQuestion.question_type === 'toeic_writing' ? 14 : 10}
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

        </div>

        {/* Cột phải: thanh điều khiển + danh sách câu theo phần (mặc định ẩn) */}
        <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0 order-1 lg:order-2 lg:sticky lg:top-4 lg:self-start space-y-3 z-20">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={onBack}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 flex-shrink-0"
                >
                  <ArrowLeft className="h-4 w-4" /> Quay lại
                </button>
                {assignment && (
                  <h2 className="text-sm font-semibold text-gray-800 text-right line-clamp-2 flex-1 min-w-0">
                    {assignment.title}
                  </h2>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>{answeredCount}/{questions.length}</span>
                </div>
                {timeLeft !== null && (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-mono font-bold ${timerColor}`}>
                    <Clock className="h-4 w-4" />
                    {formatTimer(timeLeft)}
                  </div>
                )}
              </div>
              <Button
                variant="success"
                icon={Send}
                className="w-full"
                onClick={() => handleSubmit(false)}
                loading={submitting}
                size="sm"
              >
                Nộp bài
              </Button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <List className="h-4 w-4 text-gray-500" />
              Danh sách câu ({questions.length})
            </span>
            {sidebarOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>

          {sidebarOpen && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 max-h-[min(70vh,560px)] overflow-y-auto overscroll-contain">
              {questionPartGroups.map((group) => (
                <div key={group.key} className="mb-4 last:mb-0">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2 pr-1">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.indices.map((idx) => questionNavButton(idx))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

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

import { useState, useEffect, useContext, useMemo, useRef, useCallback } from 'react'
import {
  ArrowLeft, Clock, CheckCircle, AlertTriangle, Send,
  ChevronLeft, ChevronRight, Headphones, Image as ImageIcon,
  PlayCircle, Lock, Hourglass, Volume2, FlaskConical,
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
import { normalizeMediaUrl } from '../../utils/googleDrive'

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

/** Sau khi bấm "Bắt đầu thi": đếm ngược chuẩn bị trước khi vào audio câu 1 */
const LISTENING_PREP_SECONDS = 10

/** Khoảng nghỉ cố định giữa hai câu (sau khi audio kết thúc) — dùng cho mọi Part */
const LISTENING_GAP_SECONDS = 5

/** Phase trong chế độ thi mô phỏng */
const PHASE = {
  IDLE: 'idle',                 // chưa bắt đầu (chờ HS bấm "Bắt đầu thi")
  AUDIO: 'audio',               // audio đang phát (chờ onEnded)
  ANSWER: 'answer',             // hết audio — nghỉ 5s để chọn đáp án
  FINISHED: 'finished',         // đã hết câu cuối, đang nộp
}

/**
 * @param {object} [previewAssignment] — Khi có, component chạy ở chế độ XEM TRƯỚC
 *   cho giáo viên (không gọi API start/submit, không lưu localStorage).
 */
export default function TakeToeicListening({ assignmentId, onBack, onComplete, previewAssignment }) {
  const isPreview = !!previewAssignment
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

  // === Exam-mode state ===
  const [phase, setPhase] = useState(PHASE.IDLE)
  const [phaseLeft, setPhaseLeft] = useState(0)   // giây còn lại của phase hiện tại
  const [examStarted, setExamStarted] = useState(false)
  /** Chế độ thi: sau "Bắt đầu thi" đếm ngược LISTENING_PREP_SECONDS giây; null = không trong giai đoạn chờ */
  const [listeningPrepRemaining, setListeningPrepRemaining] = useState(null)
  const audioRef = useRef(null)
  const autoNextScheduledRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      setLoading(true)
      setError(null)
      try {
        let assignmentData
        if (isPreview) {
          assignmentData = previewAssignment
        } else {
          const aRes = await assignmentsService.getById(assignmentId)
          assignmentData = unwrapApiPayload(aRes)
        }
        if (cancelled) return

        if (!isPreview && !assignmentData?.id) {
          setError('Không tải được nội dung bài tập. Hãy đăng nhập lại hoặc tải lại trang.')
          return
        }

        setAssignment(assignmentData)
        const qs = assignmentData?.questions || assignmentData?.assignment_questions || []
        const sortedQs = [...qs].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        setQuestions(sortedQs)

        if (sortedQs.length === 0) {
          setError('Bài thi chưa có câu hỏi nào.')
          setLoading(false)
          return
        }

        if (assignmentData?.time_limit_minutes) {
          setTimeLeft(assignmentData.time_limit_minutes * 60)
        }

        if (isPreview) {
          setSubmission({ id: `preview_${assignmentId || 'new'}`, started_at: new Date().toISOString() })
          return
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
  }, [assignmentId, isPreview, previewAssignment])

  useEffect(() => {
    if (isPreview) return
    if (!submission?.id || Object.keys(answers).length === 0) return
    try {
      localStorage.setItem(`draft_answers_${submission.id}`, JSON.stringify(answers))
    } catch {}
  }, [answers, submission?.id, isPreview])

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

      if (isPreview) {
        let mcqTotal = 0
        let mcqCorrect = 0
        for (const q of questions) {
          if (q.question_type !== 'multiple_choice') continue
          mcqTotal += 1
          const opts = q.options || []
          const correctIdx = opts.findIndex((o) => o?.is_correct === true)
          const picked = answers[q.id]?.selected_option_index
          if (correctIdx >= 0 && picked === correctIdx) mcqCorrect += 1
        }
        const summary = mcqTotal > 0
          ? `Xem trước: TN đúng ${mcqCorrect}/${mcqTotal}.`
          : 'Đã hoàn tất xem trước.'
        success(summary)
        onComplete?.({ id: null, preview: true, mcq_correct: mcqCorrect, mcq_total: mcqTotal })
        return
      }

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
  }, [submission, questions, answers, success, showError, onComplete, isPreview])

  const handleSubmitRef = useRef(async (_forced) => {})

  useEffect(() => {
    handleSubmitRef.current = handleSubmit
  }, [handleSubmit])

  // === Đếm ngược chuẩn bị 10s (chỉ chế độ thi mô phỏng) ===
  useEffect(() => {
    if (listeningPrepRemaining === null || listeningPrepRemaining <= 0) return
    const t = setInterval(() => {
      setListeningPrepRemaining((c) => {
        if (c === null || c <= 1) return null
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [listeningPrepRemaining])

  // === Đồng hồ tổng cho cả bài (giới hạn phút) — tạm dừng trong lúc đếm ngược chuẩn bị ===
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return
    // Tạm dừng đồng hồ tổng trong 10s chuẩn bị (không phụ thuộc cột listening_exam_mode trong DB)
    if (listeningPrepRemaining !== null && listeningPrepRemaining > 0) return
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
  }, [timeLeft !== null, listeningPrepRemaining])

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

  // Chuyển link Google Drive sang URL có thể dùng trực tiếp ở thẻ <audio>/<img>
  const groupAudioPlay = useMemo(() => normalizeMediaUrl(groupAudioUrl, 'audio'), [groupAudioUrl])
  const singleAudioPlay = useMemo(() => normalizeMediaUrl(singleAudioUrl, 'audio'), [singleAudioUrl])
  const part1ImagePlay = useMemo(
    () => normalizeMediaUrl(currentQuestion?.file_url || '', 'image'),
    [currentQuestion?.file_url]
  )

  // === Cấu hình chế độ thi ===
  // Luồng đơn giản: 10s chuẩn bị → tự phát audio câu 1 → hết audio nghỉ 5s → câu kế tiếp → … → câu cuối → nộp.
  const examMode = true
  const cfg = useMemo(() => ({
    answerSec: LISTENING_GAP_SECONDS,
    part34Sec: LISTENING_GAP_SECONDS,
    directionsSec: 0,
  }), [])

  const showPartHeader = currentQ === 0 || (questions.length > 0 && getToeicListeningMeta(currentQ - 1).part !== meta.part)

  // === beforeunload: cảnh báo khi đang trong chế độ exam (bỏ qua khi xem trước) ===
  useEffect(() => {
    if (!examMode || !examStarted || isPreview) return
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [examMode, examStarted, isPreview])

  // === Phase machine: chạy khi exam mode + đã start, mỗi khi currentQ thay đổi ===
  useEffect(() => {
    if (!examMode || !examStarted || questions.length === 0) return
    if (phase === PHASE.FINISHED) return
    // Chưa hết 10s chuẩn bị → chưa vào audio
    if (listeningPrepRemaining !== null && listeningPrepRemaining > 0) return

    autoNextScheduledRef.current = false

    // Part 3/4 — câu thứ 2/3 trong nhóm: audio đoạn đã phát ở câu đầu nhóm → nghỉ 5s rồi chuyển câu
    if ((meta.part === 3 || meta.part === 4) && (meta.indexInGroup ?? 0) > 0) {
      setPhase(PHASE.ANSWER)
      setPhaseLeft(LISTENING_GAP_SECONDS)
      return
    }

    // Câu thường: chờ audio tự phát rồi nghỉ 5s
    setPhase(PHASE.AUDIO)
    setPhaseLeft(0)
  }, [currentQ, examMode, examStarted, meta.part, meta.indexInGroup, questions.length, listeningPrepRemaining])

  // === Đồng hồ phase ANSWER (nghỉ 5s) ===
  useEffect(() => {
    if (!examMode || !examStarted) return
    if (phase !== PHASE.ANSWER) return
    if (phaseLeft <= 0) return
    const t = setInterval(() => {
      setPhaseLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [phase, phaseLeft > 0, examMode, examStarted])

  // === Hết phase ANSWER → tự chuyển câu kế tiếp (hoặc nộp bài nếu là câu cuối) ===
  useEffect(() => {
    if (!examMode || !examStarted) return
    if (phase !== PHASE.ANSWER) return
    if (phaseLeft !== 0) return
    if (autoNextScheduledRef.current) return
    autoNextScheduledRef.current = true

    if (currentQ < questions.length - 1) {
      setCurrentQ((q) => q + 1)
    } else {
      setPhase(PHASE.FINISHED)
      void handleSubmitRef.current?.(true)
    }
  }, [phase, phaseLeft, currentQ, questions.length, examMode, examStarted])

  // === Audio onEnded handler — luôn nghỉ 5s ===
  const handleAudioEnded = useCallback(() => {
    if (!examMode || !examStarted) return
    setPhase(PHASE.ANSWER)
    setPhaseLeft(LISTENING_GAP_SECONDS)
  }, [examMode, examStarted])

  // === Bắt buộc đăng ký user gesture qua nút "Bắt đầu thi" để autoplay không bị block ===
  const handleStartExam = useCallback(() => {
    setExamStarted(true)
    setListeningPrepRemaining(LISTENING_PREP_SECONDS)
  }, [])

  // === Khi không có audio cho câu hiện tại trong exam mode → bỏ qua sang ANSWER ngay
  // (tránh kẹt mãi ở phase AUDIO nếu giáo viên chưa upload audio cho câu đó)
  useEffect(() => {
    if (!examMode || !examStarted) return
    if (phase !== PHASE.AUDIO) return
    let url = null
    if (meta.part === 1 || meta.part === 2) url = singleAudioUrl
    else if ((meta.part === 3 || meta.part === 4) && (meta.indexInGroup ?? 0) === 0) url = groupAudioUrl
    if (!url || !isDirectAudioUrl(url)) {
      // Không có audio playable → nghỉ 5s rồi sang câu kế
      setPhase(PHASE.ANSWER)
      setPhaseLeft(LISTENING_GAP_SECONDS)
    }
  }, [phase, examMode, examStarted, meta.part, meta.indexInGroup, singleAudioUrl, groupAudioUrl])

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

  // === Splash: chế độ thi mô phỏng — yêu cầu HS xác nhận để cho phép autoplay ===
  if (examMode && !examStarted) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <div className="bg-white rounded-2xl border border-rose-200 shadow-lg p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
              <Lock className="h-6 w-6 text-rose-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Chế độ thi mô phỏng — TOEIC Listening</h2>
              <p className="text-sm text-gray-500">{assignment?.title}</p>
            </div>
          </div>

          <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-900 space-y-2">
            <p className="font-semibold">Khi bấm "Bắt đầu thi":</p>
            <ul className="list-disc pl-5 space-y-1.5 text-rose-800">
              <li>
                Đếm ngược <strong>{LISTENING_PREP_SECONDS} giây</strong> chuẩn bị, sau đó audio câu 1 sẽ <strong>tự
                động phát</strong>.
              </li>
              <li>Audio <strong>không thể tua</strong> hay phát lại.</li>
              <li>
                Có thể <strong>tích đáp án ngay trong khi audio đang phát</strong>. Sau khi audio mỗi câu kết thúc,
                có thêm <strong>{LISTENING_GAP_SECONDS} giây</strong> để chốt rồi tự chuyển câu kế tiếp.
              </li>
              <li>
                <strong>Không thể quay lại câu trước</strong> hay mở câu khác trong thanh điều hướng.
              </li>
              <li>Hết câu cuối, hệ thống tự động nộp bài.</li>
              <li>Nếu rời/đóng tab, tiến trình thi sẽ bị mất.</li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" icon={ArrowLeft} onClick={onBack}>Huỷ</Button>
            <Button variant="primary" icon={PlayCircle} onClick={handleStartExam}>
              Bắt đầu thi
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // === Sau "Bắt đầu thi": đếm ngược chuẩn bị → rồi vào Directions Part 1 / audio ===
  if (
    examMode &&
    examStarted &&
    listeningPrepRemaining !== null &&
    listeningPrepRemaining > 0
  ) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4">
        <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-xl p-10 text-center space-y-6">
          <p className="text-sm font-semibold text-indigo-800 uppercase tracking-wide">Chuẩn bị</p>
          <div
            className="text-7xl sm:text-8xl font-black tabular-nums text-indigo-600 tracking-tight select-none"
            aria-live="polite"
          >
            {listeningPrepRemaining}
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">
            Sau khi hết thời gian chuẩn bị, audio câu 1 sẽ tự phát. Mỗi câu nghỉ{' '}
            <strong>{LISTENING_GAP_SECONDS} giây</strong> để chọn đáp án rồi tự chuyển câu — phát liên tục đến hết
            bài. Hãy kiểm tra tai nghe và tập trung.
          </p>
          {isPreview && (
            <Button variant="outline" icon={ArrowLeft} onClick={onBack} className="mt-2">
              Thoát xem trước
            </Button>
          )}
        </div>
      </div>
    )
  }

  const qText = currentQuestion?.question_text || currentQuestion?.text || ''
  const opts = normalizeMcqOptions(currentQuestion?.options)

  // Trong exam mode: ẩn nút mở câu khác / Trước / Sau / số câu để khoá tương tác
  const lockNav = examMode && examStarted

  // Khi nào hiển thị block audio?
  // - Free mode: như cũ
  // - Exam mode: chỉ render khi phase >= AUDIO của câu thuộc loại có audio (P1/P2 hoặc câu đầu nhóm P3/P4),
  //   và phải tự autoplay (không có controls).
  const isPart1or2 = meta.part === 1 || meta.part === 2
  const isPart34Head = (meta.part === 3 || meta.part === 4) && (meta.indexInGroup ?? 0) === 0
  const showAudioBlock = examMode
    ? (isPart1or2 || isPart34Head)
    : (isPart1or2 || (meta.part === 3 || meta.part === 4))

  return (
    <div className="max-w-4xl mx-auto">
      {isPreview && (
        <div className="mb-4 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/80 px-4 py-3 flex items-start gap-3">
          <FlaskConical className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-900 leading-relaxed">
            <strong className="font-semibold">Chế độ xem trước (giáo viên).</strong>{' '}
            Bài làm <strong>không được lưu</strong>; "Nộp bài" chỉ tự chấm trắc nghiệm cục bộ rồi đóng màn này.
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            {(!lockNav || isPreview) && (
              <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
                <ArrowLeft className="h-4 w-4" /> {isPreview ? 'Thoát xem trước' : 'Quay lại'}
              </button>
            )}
            {lockNav && !isPreview && (
              <span className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 px-2 py-1 rounded-md font-medium">
                <Lock className="h-3.5 w-3.5" /> Đang thi — khoá tương tác
              </span>
            )}
            {assignment && (
              <div>
                <h2 className="text-sm font-semibold text-gray-900">{assignment.title}</h2>
                <p className="text-xs text-gray-500">
                  TOEIC Listening · {questions.length} câu
                  {questions.length !== TOEIC_FULL_QUESTIONS && (
                    <span> (đề rút gọn — chuẩn đầy đủ {TOEIC_FULL_QUESTIONS} câu)</span>
                  )}
                  {assignment?.time_limit_minutes != null && Number(assignment.time_limit_minutes) > 0 && (
                    <span> · ~{assignment.time_limit_minutes} phút</span>
                  )}
                  {' '}· Thang 5–495
                  {examMode && <span className="ml-1 text-rose-600">· Chế độ thi mô phỏng</span>}
                </p>
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

            {!lockNav && (
              <Button variant="success" icon={Send} onClick={() => handleSubmit(false)} loading={submitting} size="sm">
                Nộp bài
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-1.5 mt-3 flex-wrap">
          {questions.map((q, idx) => {
            const a = answers[q.id]
            const isAnswered = a?.selected_option_index !== undefined && a?.selected_option_index !== null
            const isCurrent = idx === currentQ
            const disabled = lockNav
            return (
              <button
                key={q.id}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setCurrentQ(idx)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-md scale-110'
                    : isAnswered
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
                title={disabled ? 'Đã khoá trong chế độ thi mô phỏng' : `Câu ${idx + 1}`}
              >
                {idx + 1}
              </button>
            )
          })}
        </div>
      </div>

      {/* Banner thông tin về thời gian / chế độ */}
      {!examMode ? (
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
      ) : (
        <PhaseBanner phase={phase} phaseLeft={phaseLeft} cfg={cfg} meta={meta} />
      )}

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

        {(
          <>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-semibold text-indigo-600">
                Câu {currentQ + 1} / {questions.length}
                {meta.part && (meta.part === 3 || meta.part === 4) && (
                  <span className="text-gray-500 font-normal ml-2">
                    · {meta.part === 3 ? 'Hội thoại' : 'Bài nói'} {(meta.groupIndex ?? 0) + 1}
                    {meta.indexInGroup != null ? ` — câu ${meta.indexInGroup + 1}/3` : ''}
                  </span>
                )}
              </span>
            </div>

            {/* Audio Part 3/4 (đoạn) */}
            {(meta.part === 3 || meta.part === 4) && groupAudioUrl && showAudioBlock && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-2">
                  <Headphones className="h-4 w-4 text-indigo-600" />
                  Audio đoạn
                  {examMode && (
                    <span className="ml-auto text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                      Tự phát · không thể tua
                    </span>
                  )}
                </div>
                {!examMode && (
                  <p className="text-xs text-gray-600 mb-2 break-all">
                    <span className="text-gray-500">Tên file / nguồn:</span>{' '}
                    <span className="font-medium text-gray-800">{mediaFileNameFromUrl(groupAudioUrl)}</span>
                  </p>
                )}
                {isDirectAudioUrl(groupAudioUrl) ? (
                  examMode ? (
                    isPart34Head && (
                      <audio
                        ref={audioRef}
                        key={`${groupAudioPlay}_${currentQ}`}
                        src={groupAudioPlay}
                        autoPlay
                        onEnded={handleAudioEnded}
                        onCanPlay={() => { audioRef.current?.play().catch(() => {}) }}
                        className="w-full"
                      />
                    )
                  ) : (
                    <audio key={groupAudioPlay} controls className="w-full" preload="metadata" src={groupAudioPlay}>
                      <track kind="captions" />
                    </audio>
                  )
                ) : (
                  !examMode && (
                    <a
                      href={groupAudioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 underline"
                    >
                      Mở file / liên kết âm thanh
                    </a>
                  )
                )}
                {examMode && (meta.part === 3 || meta.part === 4) && (meta.indexInGroup ?? 0) > 0 && (
                  <p className="text-xs text-gray-500 italic flex items-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5" /> Audio đoạn đã phát ở câu đầu nhóm.
                  </p>
                )}
              </div>
            )}

            {/* Audio Part 1 (mỗi câu một file) */}
            {meta.part === 1 && singleAudioUrl && showAudioBlock && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-2">
                  <Headphones className="h-4 w-4 text-indigo-600" />
                  Audio câu hỏi
                  {examMode && (
                    <span className="ml-auto text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                      Tự phát · không thể tua
                    </span>
                  )}
                </div>
                {!examMode && (
                  <p className="text-xs text-gray-600 mb-2 break-all">
                    <span className="text-gray-500">Tên file / nguồn:</span>{' '}
                    <span className="font-medium text-gray-800">{mediaFileNameFromUrl(singleAudioUrl)}</span>
                  </p>
                )}
                {isDirectAudioUrl(singleAudioUrl) ? (
                  examMode ? (
                    <audio
                      ref={audioRef}
                      key={`${singleAudioPlay}_${currentQ}`}
                      src={singleAudioPlay}
                      autoPlay
                      onEnded={handleAudioEnded}
                      onCanPlay={() => { audioRef.current?.play().catch(() => {}) }}
                      className="w-full"
                    />
                  ) : (
                    <audio controls className="w-full" preload="metadata" src={singleAudioPlay} />
                  )
                ) : (
                  !examMode && (
                    <a href={singleAudioUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">
                      Mở liên kết âm thanh
                    </a>
                  )
                )}
              </div>
            )}

            {meta.part === 1 && currentQuestion.file_url && (
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-100">
                <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-100 text-sm text-gray-700">
                  <ImageIcon className="h-4 w-4" /> Hình ảnh
                </div>
                {!examMode && (
                  <p className="px-3 py-2 text-xs bg-white border-b border-gray-100 text-gray-700 break-all">
                    <span className="text-gray-500">Tên file:</span>{' '}
                    <span className="font-medium">{mediaFileNameFromUrl(currentQuestion.file_url)}</span>
                  </p>
                )}
                <img
                  src={part1ImagePlay}
                  alt={`TOEIC Part 1 — câu ${currentQ + 1}`}
                  className="w-full max-h-[360px] object-contain mx-auto block"
                />
              </div>
            )}

            {/* Audio Part 2 */}
            {meta.part === 2 && singleAudioUrl && showAudioBlock && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-2">
                  <Headphones className="h-4 w-4 text-indigo-600" />
                  Audio
                  {examMode && (
                    <span className="ml-auto text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                      Tự phát · không thể tua
                    </span>
                  )}
                </div>
                {!examMode && (
                  <p className="text-xs text-gray-600 mb-2 break-all">
                    <span className="text-gray-500">Tên file / nguồn:</span>{' '}
                    <span className="font-medium text-gray-800">{mediaFileNameFromUrl(singleAudioUrl)}</span>
                  </p>
                )}
                {isDirectAudioUrl(singleAudioUrl) ? (
                  examMode ? (
                    <audio
                      ref={audioRef}
                      key={`${singleAudioPlay}_${currentQ}`}
                      src={singleAudioPlay}
                      autoPlay
                      onEnded={handleAudioEnded}
                      onCanPlay={() => { audioRef.current?.play().catch(() => {}) }}
                      className="w-full"
                    />
                  ) : (
                    <audio controls className="w-full" preload="metadata" src={singleAudioPlay} />
                  )
                ) : (
                  !examMode && (
                    <a href={singleAudioUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">
                      Mở liên kết âm thanh
                    </a>
                  )
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
                // Trong exam mode: chỉ cho chọn ở phase ANSWER
                // Cho phép tích đáp án trong cả lúc audio đang phát; chỉ khoá khi đã chuyển câu (phase IDLE/FINISHED là biên).
                const canSelect = !examMode || phase === PHASE.AUDIO || phase === PHASE.ANSWER
                return (
                  <button
                    key={optIdx}
                    type="button"
                    disabled={!canSelect}
                    onClick={() => canSelect && updateAnswer(currentQuestion.id, 'selected_option_index', optIdx)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40'
                    } ${!canSelect ? 'opacity-60 cursor-not-allowed' : ''}`}
                    title={!canSelect ? 'Chưa thể chọn ở giai đoạn này' : ''}
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

            {/* Trong exam mode: ẩn các nút điều hướng thủ công */}
            {!lockNav && (
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
            )}
          </>
        )}
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

/** Banner đếm ngược phase trong exam mode */
function PhaseBanner({ phase, phaseLeft, cfg, meta }) {
  if (phase === PHASE.AUDIO) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 mb-4 text-sm text-blue-900 flex items-center gap-2">
        <Volume2 className="h-4 w-4 animate-pulse" />
        <span>
          <strong>Audio đang phát…</strong> Bạn có thể tích đáp án ngay trong khi nghe; sau khi audio kết thúc còn 5s để chốt.
        </span>
      </div>
    )
  }
  if (phase === PHASE.ANSWER) {
    const sec = cfg.answerSec
    return (
      <div className={`rounded-lg border px-3 py-2 mb-4 text-sm flex items-center gap-2 ${
        phaseLeft <= 2 ? 'border-rose-300 bg-rose-50 text-rose-900 animate-pulse' : 'border-emerald-200 bg-emerald-50 text-emerald-900'
      }`}>
        <Hourglass className="h-4 w-4" />
        <span>
          <strong>Chọn đáp án</strong> — còn{' '}
          <strong className="font-mono">{phaseLeft}</strong>/{sec}s rồi tự chuyển câu.
        </span>
      </div>
    )
  }
  if (phase === PHASE.FINISHED) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 mb-4 text-sm text-emerald-900 flex items-center gap-2">
        <CheckCircle className="h-4 w-4" />
        <span>Đã hết bài — đang nộp tự động…</span>
      </div>
    )
  }
  return null
}

import { useState, useContext, useCallback } from 'react'
import {
  CheckCircle, Clock, FileText, Users, Search, ChevronRight,
  Star, MessageSquare, Send, ArrowLeft, Circle, XCircle
} from 'lucide-react'
import Button from '../common/Button'
import Modal from '../common/Modal'
import LoadingSpinner from '../common/LoadingSpinner'
import Select from '../common/Select'
import { useFetch } from '../../hooks/useFetch'
import { useAuth } from '../../hooks/useAuth'
import { ToastContext } from '../../context/ToastContext'
import submissionsService from '../../services/submissions.service'
import classesService from '../../services/classes.service'
import assignmentsService from '../../services/assignments.service'
import { formatDate } from '../../utils/formatDate'

const STATUS_MAP = {
  submitted: { label: 'Chờ chấm', color: 'bg-amber-100 text-amber-700', icon: Clock },
  graded: { label: 'Đã chấm', color: 'bg-green-100 text-green-700', icon: CheckCircle },
}

export default function SubmissionManager() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('')
  const [gradingSubmission, setGradingSubmission] = useState(null)
  const { success, error: showError } = useContext(ToastContext)

  const fetchClasses = useCallback(() => classesService.getAll(), [])
  const { data: classesData } = useFetch(fetchClasses)
  const classes = Array.isArray(classesData) ? classesData : classesData?.classes || []
  const classOptions = classes.map(c => ({ value: c.id, label: c.name }))

  const fetchAssignments = useCallback(
    () => selectedClassId ? assignmentsService.getAll({ class_id: selectedClassId, limit: 100 }) : Promise.resolve({ data: [] }),
    [selectedClassId]
  )
  const { data: assignmentsData } = useFetch(fetchAssignments, [selectedClassId])
  const assignments = Array.isArray(assignmentsData) ? assignmentsData : assignmentsData?.assignments || []
  const assignmentOptions = assignments.map(a => ({ value: a.id, label: `${a.title} (${a.total_points || 0} điểm)` }))

  const fetchSubmissions = useCallback(
    () => selectedAssignmentId ? submissionsService.getByAssignment(selectedAssignmentId, { limit: 100 }) : Promise.resolve({ data: [] }),
    [selectedAssignmentId]
  )
  const { data: submissionsData, loading, execute: reload } = useFetch(fetchSubmissions, [selectedAssignmentId])
  const submissions = Array.isArray(submissionsData) ? submissionsData : submissionsData?.submissions || []

  const pendingCount = submissions.filter(s => s.status === 'submitted').length
  const gradedCount = submissions.filter(s => s.status === 'graded').length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Chấm bài & Bảng điểm</h1>
        <p className="text-sm text-gray-500 mt-1">Xem bài nộp và chấm điểm học sinh</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <Select
          label="Lớp học"
          value={selectedClassId}
          onChange={(e) => { setSelectedClassId(e.target.value); setSelectedAssignmentId('') }}
          options={classOptions}
          placeholder="Chọn lớp..."
        />
        <Select
          label="Bài tập"
          value={selectedAssignmentId}
          onChange={(e) => setSelectedAssignmentId(e.target.value)}
          options={assignmentOptions}
          placeholder={selectedClassId ? 'Chọn bài tập...' : 'Chọn lớp trước'}
          disabled={!selectedClassId}
        />
      </div>

      {/* Stats */}
      {selectedAssignmentId && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{submissions.length}</p>
            <p className="text-xs text-gray-500">Tổng bài nộp</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
            <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
            <p className="text-xs text-amber-600">Chờ chấm</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{gradedCount}</p>
            <p className="text-xs text-green-600">Đã chấm</p>
          </div>
        </div>
      )}

      {/* Submissions list */}
      {!selectedAssignmentId ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Chọn lớp và bài tập để xem danh sách bài nộp</p>
        </div>
      ) : loading ? (
        <LoadingSpinner />
      ) : submissions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Chưa có học sinh nào nộp bài</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map(sub => {
            const statusCfg = STATUS_MAP[sub.status] || STATUS_MAP.submitted
            const StatusIcon = statusCfg.icon
            const assignment = assignments.find(a => a.id === sub.assignment_id)

            return (
              <div
                key={sub.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setGradingSubmission(sub)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-semibold text-gray-900">{sub.student_name || '—'}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                        <StatusIcon className="h-3 w-3" /> {statusCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>📧 {sub.student_email || '—'}</span>
                      <span>🕐 Nộp: {formatDate(sub.submitted_at)}</span>
                      {sub.time_spent_seconds && (
                        <span>⏱️ {Math.floor(sub.time_spent_seconds / 60)} phút</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {sub.status === 'graded' && (
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {sub.score ?? '—'}<span className="text-sm text-gray-400">/{assignment?.total_points || sub.total_points}</span>
                        </p>
                      </div>
                    )}
                    <ChevronRight className="h-5 w-5 text-gray-300" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Grading modal */}
      {gradingSubmission && (
        <GradingModal
          submissionId={gradingSubmission.id}
          onClose={() => setGradingSubmission(null)}
          onGraded={() => { setGradingSubmission(null); reload() }}
        />
      )}
    </div>
  )
}

/* ========== GRADING MODAL ========== */
function GradingModal({ submissionId, onClose, onGraded }) {
  const [answerGrades, setAnswerGrades] = useState({}) // { answerId: { score, feedback } }
  const [overallFeedback, setOverallFeedback] = useState('')
  const [grading, setGrading] = useState(false)
  const { success, error: showError } = useContext(ToastContext)

  const fetchSubmission = useCallback(() => submissionsService.getById(submissionId), [submissionId])
  const { data: subData, loading } = useFetch(fetchSubmission)
  const submission = subData?.data || subData

  const updateGrade = (answerId, field, value) => {
    setAnswerGrades(prev => ({
      ...prev,
      [answerId]: { ...(prev[answerId] || {}), [field]: value },
    }))
  }

  const handleGrade = async () => {
    setGrading(true)
    try {
      const grades = Object.entries(answerGrades)
        .filter(([_, v]) => v.score !== undefined && v.score !== '')
        .map(([id, v]) => ({
          answer_id: id,
          score: Number(v.score),
          feedback: v.feedback || null,
        }))

      await submissionsService.grade(submissionId, {
        answer_grades: grades,
        feedback: overallFeedback || null,
      })
      success('Chấm điểm thành công!')
      onGraded()
    } catch (err) {
      showError(err.response?.data?.message || 'Chấm điểm thất bại')
    } finally {
      setGrading(false)
    }
  }

  if (loading || !submission) {
    return (
      <Modal isOpen onClose={onClose} title="Chấm bài" size="2xl">
        <LoadingSpinner />
      </Modal>
    )
  }

  const answers = submission.answers || []
  const isAlreadyGraded = submission.status === 'graded'

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Chấm bài — ${submission.student_name || 'Học sinh'}`}
      size="2xl"
      footer={!isAlreadyGraded ? (
        <>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
          <Button variant="success" icon={Send} onClick={handleGrade} loading={grading}>
            Lưu điểm
          </Button>
        </>
      ) : (
        <Button variant="outline" onClick={onClose}>Đóng</Button>
      )}
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Info banner */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            <span>Nộp lúc: {formatDate(submission.submitted_at)}</span>
            {submission.time_spent_seconds && (
              <span className="ml-4">Thời gian: {Math.floor(submission.time_spent_seconds / 60)} phút</span>
            )}
          </div>
          {isAlreadyGraded && (
            <span className="text-lg font-bold text-green-600">
              {submission.score}/{submission.total_points}
            </span>
          )}
        </div>

        {/* Each answer */}
        {answers.map((answer, idx) => {
          const q = answer.question || {}
          const isMCQ = q.question_type === 'multiple_choice'
          const opts = q.options || []
          const needsGrading = !isMCQ && !isAlreadyGraded
          const currentGrade = answerGrades[answer.id] || {}

          return (
            <div key={answer.id || idx} className={`border rounded-xl p-4 ${
              answer.is_correct === true ? 'border-green-200' :
              answer.is_correct === false ? 'border-red-200' : 'border-gray-200'
            }`}>
              <div className="flex items-start justify-between mb-2">
                <p className="text-sm font-medium text-gray-900">
                  <span className="text-gray-400">Câu {idx + 1}.</span> {q.question_text || '—'}
                </p>
                <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{q.points || 0} điểm</span>
              </div>

              {/* MCQ: show selected + correct */}
              {isMCQ && (
                <div className="space-y-1 mb-2">
                  {opts.map((opt, oi) => {
                    const isSelected = answer.selected_option_index === oi
                    const isCorrect = opt.is_correct === true
                    return (
                      <div key={oi} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                        isSelected && isCorrect ? 'bg-green-50 text-green-700' :
                        isSelected && !isCorrect ? 'bg-red-50 text-red-700' :
                        isCorrect ? 'bg-green-50/50 text-green-600' : 'text-gray-500'
                      }`}>
                        {isSelected ? (isCorrect ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />) : <Circle className="h-3.5 w-3.5 text-gray-300" />}
                        <span>{String.fromCharCode(65 + oi)}. {opt.text}</span>
                      </div>
                    )
                  })}
                  <p className="text-xs mt-1">
                    {answer.is_correct
                      ? <span className="text-green-600 font-medium">✅ Đúng — {answer.score}/{q.points} điểm</span>
                      : <span className="text-red-600 font-medium">❌ Sai — 0/{q.points} điểm</span>
                    }
                  </p>
                </div>
              )}

              {/* Essay: show answer + grading inputs */}
              {!isMCQ && (
                <div className="space-y-2">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Câu trả lời:</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{answer.answer_text || '(Không trả lời)'}</p>
                  </div>

                  {needsGrading ? (
                    <div className="grid grid-cols-4 gap-2">
                      <div className="col-span-1">
                        <label className="text-xs text-gray-500">Điểm</label>
                        <input
                          type="number"
                          min={0}
                          max={q.points || 10}
                          step={0.5}
                          value={currentGrade.score ?? ''}
                          onChange={(e) => updateGrade(answer.id, 'score', e.target.value)}
                          placeholder={`/${q.points || 0}`}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-xs text-gray-500">Nhận xét</label>
                        <input
                          type="text"
                          value={currentGrade.feedback || ''}
                          onChange={(e) => updateGrade(answer.id, 'feedback', e.target.value)}
                          placeholder="Nhận xét cho câu này..."
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ) : isAlreadyGraded && (
                    <p className="text-xs">
                      <span className="font-medium text-blue-600">{answer.score ?? '—'}/{q.points} điểm</span>
                      {answer.feedback && <span className="text-gray-500 ml-2">— {answer.feedback}</span>}
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Overall feedback */}
        {!isAlreadyGraded && (
          <div>
            <label className="text-sm font-medium text-gray-700">Nhận xét chung</label>
            <textarea
              value={overallFeedback}
              onChange={(e) => setOverallFeedback(e.target.value)}
              placeholder="Nhận xét chung cho bài làm..."
              rows={3}
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {isAlreadyGraded && submission.feedback && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" />
              <strong>Nhận xét:</strong> {submission.feedback}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}

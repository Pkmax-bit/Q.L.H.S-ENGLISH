import { useCallback, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, BookOpen, Calendar, Clock, ClipboardList, CheckCircle, AlertTriangle,
  PlayCircle, BarChart3, FileText,
} from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import RichContentViewer from '../components/common/RichContentViewer'
import Button from '../components/common/Button'
import { useFetch } from '../hooks/useFetch'
import classesService from '../services/classes.service'
import assignmentsService from '../services/assignments.service'
import submissionsService from '../services/submissions.service'
import { formatDate } from '../utils/formatDate'
import TakeAssignment from '../components/student/TakeAssignment'
import SubmissionResult from '../components/student/SubmissionResult'

function typeLabel(t) {
  if (t === 'multiple_choice') return 'Trắc nghiệm'
  if (t === 'essay') return 'Tự luận'
  if (t === 'toeic_listening') return 'TOEIC Listening'
  if (t === 'toeic_lr') return 'TOEIC Nghe & Đọc'
  if (t === 'toeic_four_skills') return 'TOEIC 4 kỹ năng'
  return t === 'mixed' ? 'Hỗn hợp' : (t || '—')
}

export default function MyAssignmentDetailPage() {
  const { assignmentId } = useParams()
  const navigate = useNavigate()
  const [taking, setTaking] = useState(false)
  const [resultId, setResultId] = useState(null)

  const fetchClasses = useCallback(() => classesService.getAll(), [])
  const { data: classesData, loading: classesLoading } = useFetch(fetchClasses, [])

  const fetchAssignment = useCallback(
    () => assignmentsService.getById(assignmentId),
    [assignmentId]
  )
  const { data: assignment, loading: assignmentLoading, error: assignmentError } =
    useFetch(fetchAssignment, [assignmentId])

  const fetchMySubmission = useCallback(
    () => submissionsService.getMyForAssignment(assignmentId),
    [assignmentId]
  )
  const { data: mySubmission, loading: subLoading, execute: refetchSubmission } =
    useFetch(fetchMySubmission, [assignmentId])

  const classes = Array.isArray(classesData) ? classesData : classesData?.classes || []
  const classIds = useMemo(() => classes.map(c => c.id), [classes])

  const canAccess = useMemo(() => {
    if (!assignment?.class_id) return false
    return classIds.some(id => String(id) === String(assignment.class_id))
  }, [assignment?.class_id, classIds])

  const questionCount = assignment?.questions?.length ?? assignment?.question_count ?? 0

  const isDone = mySubmission && (mySubmission.status === 'submitted' || mySubmission.status === 'graded')
  const inProgress = mySubmission?.status === 'in_progress'

  const handleTakeComplete = (submission) => {
    setTaking(false)
    if (submission?.id) setResultId(submission.id)
    refetchSubmission()
  }

  if (taking) {
    return (
      <TakeAssignment
        assignmentId={assignmentId}
        onBack={() => {
          setTaking(false)
          refetchSubmission()
        }}
        onComplete={handleTakeComplete}
      />
    )
  }

  if (resultId) {
    return (
      <SubmissionResult
        submissionId={resultId}
        onBack={() => {
          setResultId(null)
          refetchSubmission()
        }}
      />
    )
  }

  const loading = classesLoading || assignmentLoading || subLoading

  if (loading && !assignment) {
    return <LoadingSpinner message="Đang tải bài tập..." />
  }

  if (assignmentError || !assignment) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <AlertTriangle className="h-14 w-14 text-amber-400 mx-auto mb-3" />
        <p className="text-gray-700 font-medium">Không tải được bài tập hoặc bài không tồn tại.</p>
        <Link to="/my-assignments" className="inline-block mt-4 text-blue-600 hover:underline text-sm">
          ← Quay lại danh sách
        </Link>
      </div>
    )
  }

  if (classesLoading) {
    return <LoadingSpinner message="Đang kiểm tra lớp học..." />
  }

  if (!canAccess) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <AlertTriangle className="h-14 w-14 text-amber-400 mx-auto mb-3" />
        <p className="text-gray-700 font-medium">Bạn không thuộc lớp của bài tập này.</p>
        <Link to="/my-assignments" className="inline-block mt-4 text-blue-600 hover:underline text-sm">
          ← Quay lại danh sách
        </Link>
      </div>
    )
  }

  const now = new Date()
  const overdue = assignment.due_date && new Date(assignment.due_date) < now && !isDone

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => navigate('/my-assignments')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="h-4 w-4" /> Bài tập của tôi
      </button>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{assignment.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1">
                <BookOpen className="h-4 w-4 text-gray-400" />
                {assignment.class_name || 'Lớp'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-medium">
                {typeLabel(assignment.assignment_type)}
              </span>
            </div>
          </div>

          {mySubmission?.status === 'graded' && mySubmission.score != null && (
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {mySubmission.score}/{assignment.total_points ?? '—'}
              </div>
              <span className="text-xs text-gray-500">Điểm</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600 border-t border-gray-100 pt-4">
          {assignment.total_points != null && (
            <span className="flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4 text-gray-400" /> {assignment.total_points} điểm
            </span>
          )}
          {questionCount > 0 && (
            <span className="flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-gray-400" /> {questionCount} câu
            </span>
          )}
          {assignment.time_limit_minutes && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-gray-400" /> {assignment.time_limit_minutes} phút
            </span>
          )}
          {assignment.due_date && (
            <span className={`flex items-center gap-1.5 ${overdue ? 'text-red-600 font-medium' : ''}`}>
              <Calendar className="h-4 w-4" />
              Hạn: {formatDate(assignment.due_date)}
              {overdue && ' (đã quá hạn)'}
            </span>
          )}
        </div>

        {assignment.description && String(assignment.description).trim() && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Hướng dẫn / mô tả</p>
            <div className="prose prose-sm max-w-none text-gray-700">
              <RichContentViewer content={assignment.description} />
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {isDone ? (
            <>
              <Button
                variant="success"
                icon={BarChart3}
                onClick={() => mySubmission?.id && setResultId(mySubmission.id)}
              >
                Xem kết quả
              </Button>
              <p className="w-full text-xs text-gray-500 flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                {mySubmission.status === 'graded' ? 'Đã chấm điểm' : 'Đã nộp — chờ chấm'}
              </p>
            </>
          ) : (
            <>
              <Button variant="primary" icon={PlayCircle} onClick={() => setTaking(true)}>
                {inProgress ? 'Tiếp tục làm bài' : 'Vào làm bài'}
              </Button>
              {overdue && (
                <p className="w-full text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Bài đã quá hạn nộp theo lịch lớp; vẫn có thể làm nếu giáo viên cho phép.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

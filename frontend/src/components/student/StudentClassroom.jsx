import { useState, useCallback, useMemo } from 'react'
import {
  ArrowLeft, BookOpen, ClipboardList, Clock, AlertTriangle,
  Sparkles, ChevronLeft, ChevronRight, CheckCircle2, Timer, Trophy
} from 'lucide-react'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import LessonUnitSections from '../lessons/LessonUnitSections'
import LessonStudyPanel from '../lessons/LessonStudyPanel'
import { useFetch } from '../../hooks/useFetch'
import lessonsService from '../../services/lessons.service'
import lessonProgressService from '../../services/lessonProgress.service'
import assignmentsService from '../../services/assignments.service'
import submissionsService from '../../services/submissions.service'
import { formatDate } from '../../utils/formatDate'

function getDaysUntil(dateStr) {
  if (!dateStr) return null
  const now = new Date()
  const target = new Date(dateStr)
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24))
  return diff
}

function getDueDateLabel(dateStr) {
  const days = getDaysUntil(dateStr)
  if (days === null) return null
  if (days < 0) return { text: `Đã hết hạn ${Math.abs(days)} ngày`, color: 'text-red-600', bg: 'bg-red-50 border-red-200' }
  if (days === 0) return { text: 'Hết hạn hôm nay!', color: 'text-red-600', bg: 'bg-red-50 border-red-200' }
  if (days === 1) return { text: 'Hết hạn ngày mai', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' }
  if (days <= 3) return { text: `Còn ${days} ngày`, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' }
  if (days <= 7) return { text: `Còn ${days} ngày`, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' }
  return { text: `Còn ${days} ngày`, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' }
}

export default function StudentClassroom({ classData, onBack, onTakeAssignment, onViewResult }) {
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [activeTab, setActiveTab] = useState('lessons')

  const fetchLessons = useCallback(
    () => lessonsService.getAll({ class_id: classData.id, is_published: 'true', limit: 300, sortBy: 'order_index', sortOrder: 'ASC' }),
    [classData.id]
  )
  const fetchAssignments = useCallback(
    () => assignmentsService.getAll({ class_id: classData.id, is_published: 'true', limit: 100 }),
    [classData.id]
  )
  const fetchMySubmissions = useCallback(
    () => submissionsService.getMy({ class_id: classData.id, limit: 100 }),
    [classData.id]
  )
  const fetchProgress = useCallback(
    () => lessonProgressService.getMine({ class_id: classData.id }),
    [classData.id]
  )

  const { data: lessonsData, loading: lessonsLoading } = useFetch(fetchLessons)
  const { data: assignmentsData, loading: assignmentsLoading } = useFetch(fetchAssignments)
  const { data: submissionsData } = useFetch(fetchMySubmissions)
  const { data: progressData, execute: reloadProgress } = useFetch(fetchProgress)

  const lessons = Array.isArray(lessonsData) ? lessonsData : lessonsData?.lessons || []
  const assignments = Array.isArray(assignmentsData) ? assignmentsData : assignmentsData?.assignments || []
  const mySubmissions = Array.isArray(submissionsData) ? submissionsData : submissionsData?.submissions || []
  const progressList = Array.isArray(progressData) ? progressData : progressData?.progress || []
  const progressMap = useMemo(() => {
    const map = {}
    progressList.forEach((row) => { map[row.lesson_id] = row })
    return map
  }, [progressList])

  // Build submission status map: assignmentId -> submission
  const submissionMap = useMemo(() => {
    const map = {}
    mySubmissions.forEach(s => { map[s.assignment_id] = s })
    return map
  }, [mySubmissions])

  // Sort lessons by order_index
  const sortedLessons = useMemo(() => {
    return [...lessons].sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999))
  }, [lessons])

  // Categorize assignments
  const { newAssignments, dueSoonAssignments, expiredAssignments } = useMemo(() => {
    const now = new Date()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const newOnes = assignments.filter(a => {
      const created = new Date(a.created_at)
      return created >= sevenDaysAgo
    })

    const dueSoon = assignments.filter(a => {
      if (!a.due_date) return false
      const due = new Date(a.due_date)
      return due > now && due <= threeDaysFromNow
    })

    const expired = assignments.filter(a => {
      if (!a.due_date) return false
      return new Date(a.due_date) < now
    })

    return { newAssignments: newOnes, dueSoonAssignments: dueSoon, expiredAssignments: expired }
  }, [assignments])

  // Get assignments linked to a specific lesson
  const getLinkedAssignments = (lessonId) => {
    return assignments.filter(a => a.lesson_id === lessonId)
  }

  // Stats calculation
  const classStats = useMemo(() => {
    const graded = assignments.filter(a => {
      const sub = submissionMap[a.id]
      return sub && sub.status === 'graded'
    })
    const completed = assignments.filter(a => {
      const sub = submissionMap[a.id]
      return sub && (sub.status === 'graded' || sub.status === 'submitted')
    })
    const totalScore = graded.reduce((sum, a) => sum + (submissionMap[a.id]?.score || 0), 0)
    const totalMaxScore = graded.reduce((sum, a) => sum + (a.total_points || 0), 0)
    const avgPercent = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : null

    return {
      completedCount: completed.length,
      totalCount: assignments.length,
      totalScore,
      totalMaxScore,
      avgPercent,
    }
  }, [assignments, submissionMap])

  const loading = lessonsLoading || assignmentsLoading

  // If viewing a specific lesson
  if (selectedLesson) {
    return (
      <LessonViewer
        lesson={selectedLesson}
        linkedAssignments={getLinkedAssignments(selectedLesson.id)}
        submissionMap={submissionMap}
        onBack={() => setSelectedLesson(null)}
        onTakeAssignment={onTakeAssignment}
        onViewResult={onViewResult}
        allLessons={sortedLessons}
        currentIndex={sortedLessons.findIndex(l => l.id === selectedLesson.id)}
        onNavigate={(lesson) => setSelectedLesson(lesson)}
        progress={progressMap[selectedLesson.id]}
        onSaveProgress={async (payload) => {
          await lessonProgressService.save(selectedLesson.id, payload)
          reloadProgress()
        }}
      />
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách lớp
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{classData.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Giáo viên: {classData.teacher?.full_name || classData.teacher_name || '—'}
        </p>
      </div>

      {loading ? (
        <LoadingSpinner message="Đang tải nội dung lớp học..." />
      ) : (
        <>
          {/* Student stats banner */}
          {assignments.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <Trophy className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                <div className="text-xl font-bold text-gray-900">
                  {classStats.totalScore}<span className="text-sm text-gray-400">/{classStats.totalMaxScore}</span>
                </div>
                <div className="text-xs text-gray-500">Tổng điểm</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-1" />
                <div className="text-xl font-bold text-gray-900">
                  {classStats.completedCount}<span className="text-sm text-gray-400">/{classStats.totalCount}</span>
                </div>
                <div className="text-xs text-gray-500">Bài đã làm</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <ClipboardList className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                <div className="text-xl font-bold text-gray-900">
                  {classStats.totalCount - classStats.completedCount}
                </div>
                <div className="text-xs text-gray-500">Bài chưa làm</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className={`text-xl font-bold mx-auto mb-0.5 ${
                  classStats.avgPercent === null ? 'text-gray-400'
                    : classStats.avgPercent >= 80 ? 'text-green-600'
                    : classStats.avgPercent >= 50 ? 'text-amber-600'
                    : 'text-red-600'
                }`}>
                  {classStats.avgPercent !== null ? `${classStats.avgPercent}%` : '—'}
                </div>
                <div className="text-xs text-gray-500">Điểm TB</div>
                {classStats.avgPercent !== null && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div
                      className={`h-1.5 rounded-full ${
                        classStats.avgPercent >= 80 ? 'bg-green-500' : classStats.avgPercent >= 50 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${classStats.avgPercent}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Alert banners */}
          <div className="space-y-3 mb-6">
            {/* New assignments */}
            {newAssignments.length > 0 && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <Sparkles className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">
                    {newAssignments.length} bài tập mới
                  </p>
                  <div className="mt-1 space-y-0.5">
                    {newAssignments.slice(0, 3).map(a => (
                      <p key={a.id} className="text-xs text-amber-700">
                        • {a.title}
                        {a.due_date && <span className="ml-1 opacity-70">— hạn {formatDate(a.due_date)}</span>}
                      </p>
                    ))}
                    {newAssignments.length > 3 && (
                      <p className="text-xs text-amber-600 font-medium">+{newAssignments.length - 3} bài khác</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Due soon */}
            {dueSoonAssignments.length > 0 && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <Timer className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-700">
                    ⏰ {dueSoonAssignments.length} bài sắp hết hạn
                  </p>
                  <div className="mt-1 space-y-0.5">
                    {dueSoonAssignments.map(a => {
                      const label = getDueDateLabel(a.due_date)
                      return (
                        <p key={a.id} className="text-xs text-amber-700">
                          • {a.title} — <span className="font-medium">{label?.text}</span>
                        </p>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Expired */}
            {expiredAssignments.length > 0 && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-700">
                    ❌ {expiredAssignments.length} bài đã hết hạn
                  </p>
                  <div className="mt-1 space-y-0.5">
                    {expiredAssignments.slice(0, 3).map(a => (
                      <p key={a.id} className="text-xs text-red-600">
                        • {a.title} — hết hạn {formatDate(a.due_date)}
                      </p>
                    ))}
                    {expiredAssignments.length > 3 && (
                      <p className="text-xs text-red-500 font-medium">+{expiredAssignments.length - 3} bài khác</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tabs: Bài học / Bài tập */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-5 w-fit">
            <button
              onClick={() => setActiveTab('lessons')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'lessons'
                  ? 'bg-white text-amber-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Bài học ({sortedLessons.length})
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'assignments'
                  ? 'bg-white text-amber-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              Bài tập ({assignments.length})
            </button>
          </div>

          {/* Lessons tab */}
          {activeTab === 'lessons' && (
            <LessonUnitSections
              lessons={sortedLessons}
              progressMap={progressMap}
              emptyMessage="Chưa có bài học nào"
              onItemClick={setSelectedLesson}
              renderExtra={(lesson) => {
                const linked = getLinkedAssignments(lesson.id)
                if (linked.length === 0) return null
                return (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {linked.map((a) => {
                      const label = getDueDateLabel(a.due_date)
                      return (
                        <span
                          key={a.id}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                            label ? label.bg : 'bg-green-50 border-green-200'
                          }`}
                        >
                          <ClipboardList className="h-3 w-3" />
                          {a.title}
                          {label && <span className={`ml-0.5 ${label.color}`}>• {label.text}</span>}
                        </span>
                      )
                    })}
                  </div>
                )
              }}
            />
          )}

          {/* Assignments tab */}
          {activeTab === 'assignments' && (
            <div className="space-y-3">
              {assignments.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Chưa có bài tập nào</p>
                </div>
              ) : (
                assignments.map(assignment => {
                  const label = getDueDateLabel(assignment.due_date)
                  const linkedLesson = sortedLessons.find(l => l.id === assignment.lesson_id)

                  return (
                    <div
                      key={assignment.id}
                      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-gray-900">{assignment.title}</h3>

                          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                            {assignment.assignment_type && (
                              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full font-medium">
                                {assignment.assignment_type === 'quiz' ? '📝 Trắc nghiệm' :
                                 assignment.assignment_type === 'essay' ? '✍️ Tự luận' : '📋 Hỗn hợp'}
                              </span>
                            )}
                            {assignment.total_points && (
                              <span>🏆 {assignment.total_points} điểm</span>
                            )}
                            {assignment.question_count > 0 && (
                              <span>❓ {assignment.question_count} câu hỏi</span>
                            )}
                            {assignment.time_limit_minutes && (
                              <span className="flex items-center gap-1">
                                <Timer className="h-3.5 w-3.5" />
                                {assignment.time_limit_minutes} phút
                              </span>
                            )}
                          </div>

                          {/* Due date */}
                          {label && (
                            <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-medium border ${label.bg}`}>
                              <Clock className="h-3.5 w-3.5" />
                              <span className={label.color}>{label.text}</span>
                              <span className="text-gray-400 ml-1">({formatDate(assignment.due_date)})</span>
                            </div>
                          )}

                          {/* Linked lesson */}
                          {linkedLesson && (
                            <button
                              onClick={() => setSelectedLesson(linkedLesson)}
                              className="flex items-center gap-1.5 mt-2 text-xs text-amber-700 hover:text-amber-900 transition-colors"
                            >
                              <BookOpen className="h-3.5 w-3.5" />
                              Bài học: {linkedLesson.title}
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          )}

                          {assignment.description && (
                            <p className="text-sm text-gray-500 mt-2 line-clamp-2">{assignment.description}</p>
                          )}
                        </div>

                        {/* Action button */}
                        <div className="flex-shrink-0">
                          {(() => {
                            const sub = submissionMap[assignment.id]
                            if (sub && (sub.status === 'graded' || sub.status === 'submitted')) {
                              return (
                                <button
                                  onClick={() => onViewResult?.(sub.id)}
                                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    sub.status === 'graded'
                                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                      : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                  }`}
                                >
                                  {sub.status === 'graded' ? (
                                    <><CheckCircle2 className="h-4 w-4" /> {sub.score ?? '—'}/{assignment.total_points}</>
                                  ) : (
                                    <><Clock className="h-4 w-4" /> Chờ chấm</>
                                  )}
                                </button>
                              )
                            }
                            return (
                              <button
                                onClick={() => onTakeAssignment?.(assignment.id)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                              >
                                <ClipboardList className="h-4 w-4" /> Làm bài
                              </button>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function LessonViewer({
  lesson,
  linkedAssignments = [],
  submissionMap = {},
  onBack,
  onTakeAssignment,
  onViewResult,
  allLessons = [],
  currentIndex = 0,
  onNavigate,
  progress,
  onSaveProgress,
}) {
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < allLessons.length - 1

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách bài
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-amber-700 px-6 py-5">
          <div className="flex items-center gap-2 text-amber-100 text-xs mb-2">
            <BookOpen className="h-4 w-4" />
            <span>Học từng bài</span>
            {lesson.order_index != null && <span>• Thứ tự: {lesson.order_index}</span>}
          </div>
          <h1 className="text-xl font-bold text-white">{lesson.title}</h1>
          <p className="text-amber-100 text-sm mt-1">{formatDate(lesson.created_at)}</p>
        </div>

        <div className="p-6 space-y-6">
          <LessonStudyPanel
            lesson={lesson}
            progress={progress}
            onSave={onSaveProgress}
            footer={(
              <>
                {linkedAssignments.length > 0 && (
                  <div className="pt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Bài tập giáo viên giao thêm</p>
                    <div className="space-y-2">
                      {linkedAssignments.map((a) => {
                        const label = getDueDateLabel(a.due_date)
                        const sub = submissionMap[a.id]
                        const isDone = sub && (sub.status === 'graded' || sub.status === 'submitted')
                        return (
                          <div key={a.id} className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900">{a.title}</h4>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                {a.total_points && <span>{a.total_points} điểm</span>}
                                {label && <span className={label.color}>{label.text}</span>}
                              </div>
                            </div>
                            {isDone ? (
                              <button
                                onClick={() => onViewResult?.(sub.id)}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-700"
                              >
                                {sub.status === 'graded' ? `${sub.score ?? '—'}/${a.total_points}` : 'Chờ chấm'}
                              </button>
                            ) : (
                              <button
                                onClick={() => onTakeAssignment?.(a.id)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium"
                              >
                                Làm bài
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {allLessons.length > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <button
                      onClick={() => hasPrev && onNavigate?.(allLessons[currentIndex - 1])}
                      disabled={!hasPrev}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium ${
                        hasPrev ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Bài trước
                    </button>
                    <span className="text-xs text-gray-400 font-medium">Bài {currentIndex + 1} / {allLessons.length}</span>
                    <button
                      onClick={() => hasNext && onNavigate?.(allLessons[currentIndex + 1])}
                      disabled={!hasNext}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium ${
                        hasNext ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      Bài tiếp theo
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          />
        </div>
      </div>
    </div>
  )
}

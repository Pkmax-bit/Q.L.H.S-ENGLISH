import { useState, useCallback, useMemo } from 'react'
import {
  ArrowLeft, BookOpen, ClipboardList, Clock, AlertTriangle,
  Sparkles, FileText, Youtube, FolderOpen, Link, ExternalLink,
  ChevronLeft, ChevronRight, Calendar, CheckCircle, CheckCircle2, Timer, Trophy
} from 'lucide-react'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import RichContentViewer from '../common/RichContentViewer'
import { useFetch } from '../../hooks/useFetch'
import lessonsService from '../../services/lessons.service'
import assignmentsService from '../../services/assignments.service'
import submissionsService from '../../services/submissions.service'
import { formatDate } from '../../utils/formatDate'

function extractYoutubeId(url) {
  if (!url) return null
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/)
  return match ? match[1] : null
}

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
  if (days <= 7) return { text: `Còn ${days} ngày`, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' }
  return { text: `Còn ${days} ngày`, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' }
}

export default function StudentClassroom({ classData, onBack, onTakeAssignment, onViewResult }) {
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [activeTab, setActiveTab] = useState('lessons')

  const fetchLessons = useCallback(
    () => lessonsService.getAll({ class_id: classData.id, is_published: 'true', limit: 100 }),
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

  const { data: lessonsData, loading: lessonsLoading } = useFetch(fetchLessons)
  const { data: assignmentsData, loading: assignmentsLoading } = useFetch(fetchAssignments)
  const { data: submissionsData } = useFetch(fetchMySubmissions)

  const lessons = Array.isArray(lessonsData) ? lessonsData : lessonsData?.lessons || []
  const assignments = Array.isArray(assignmentsData) ? assignmentsData : assignmentsData?.assignments || []
  const mySubmissions = Array.isArray(submissionsData) ? submissionsData : submissionsData?.submissions || []

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
                <ClipboardList className="h-5 w-5 text-blue-500 mx-auto mb-1" />
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
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <Sparkles className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-700">
                    {newAssignments.length} bài tập mới
                  </p>
                  <div className="mt-1 space-y-0.5">
                    {newAssignments.slice(0, 3).map(a => (
                      <p key={a.id} className="text-xs text-blue-600">
                        • {a.title}
                        {a.due_date && <span className="ml-1 opacity-70">— hạn {formatDate(a.due_date)}</span>}
                      </p>
                    ))}
                    {newAssignments.length > 3 && (
                      <p className="text-xs text-blue-500 font-medium">+{newAssignments.length - 3} bài khác</p>
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
                  ? 'bg-white text-blue-700 shadow-sm'
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
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              Bài tập ({assignments.length})
            </button>
          </div>

          {/* Lessons tab */}
          {activeTab === 'lessons' && (
            <div className="space-y-3">
              {sortedLessons.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Chưa có bài học nào</p>
                </div>
              ) : (
                sortedLessons.map((lesson, idx) => {
                  const linked = getLinkedAssignments(lesson.id)
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLesson(lesson)}
                      className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-blue-200 transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        {/* Lesson number */}
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                          {lesson.order_index ?? idx + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                                {lesson.title}
                              </h3>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                {lesson.content_type === 'video' && (
                                  <span className="flex items-center gap-1">
                                    <Youtube className="h-3.5 w-3.5 text-red-500" /> Video
                                  </span>
                                )}
                                {lesson.content_type === 'text' && (
                                  <span className="flex items-center gap-1">
                                    <FileText className="h-3.5 w-3.5 text-blue-500" /> Văn bản
                                  </span>
                                )}
                                {lesson.content_type === 'file' && (
                                  <span className="flex items-center gap-1">
                                    <FolderOpen className="h-3.5 w-3.5 text-amber-500" /> Tệp tin
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {formatDate(lesson.created_at)}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
                          </div>

                          {/* Linked assignments */}
                          {linked.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-2">
                              {linked.map(a => {
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
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
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
                              className="flex items-center gap-1.5 mt-2 text-xs text-blue-600 hover:text-blue-800 transition-colors"
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

/* ========== LESSON VIEWER ========== */
function LessonViewer({ lesson, linkedAssignments = [], submissionMap = {}, onBack, onTakeAssignment, onViewResult, allLessons = [], currentIndex = 0, onNavigate }) {
  const ytId = extractYoutubeId(lesson.youtube_url)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < allLessons.length - 1

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách bài
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Title bar */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-5">
          <div className="flex items-center gap-2 text-blue-200 text-xs mb-2">
            <BookOpen className="h-4 w-4" />
            <span>Bài học</span>
            {lesson.order_index != null && <span>• Thứ tự: {lesson.order_index}</span>}
          </div>
          <h1 className="text-xl font-bold text-white">{lesson.title}</h1>
          <p className="text-blue-200 text-sm mt-1">
            {formatDate(lesson.created_at)}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* YouTube embed */}
          {ytId && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Youtube className="h-5 w-5 text-red-500" /> Video bài giảng
              </p>
              <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}`}
                  title={lesson.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>
          )}

          {/* YouTube link fallback */}
          {lesson.youtube_url && !ytId && (
            <a
              href={lesson.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-800"
            >
              <Youtube className="h-4 w-4" /> Xem video bài giảng
              <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {/* Content */}
          {lesson.content && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">📝 Nội dung bài học</p>
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
                <RichContentViewer content={lesson.content} />
              </div>
            </div>
          )}

          {/* Resource links */}
          {(lesson.file_url || lesson.drive_url) && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">📎 Tài liệu đính kèm</p>
              <div className="flex flex-wrap gap-3">
                {lesson.drive_url && (
                  <a
                    href={lesson.drive_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 hover:bg-yellow-100 transition-colors"
                  >
                    <FolderOpen className="h-4 w-4" />
                    Google Drive
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {lesson.file_url && (
                  <a
                    href={lesson.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 hover:bg-blue-100 transition-colors"
                  >
                    <Link className="h-4 w-4" />
                    Tệp đính kèm
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Linked assignments */}
          {linkedAssignments.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">📋 Bài tập liên quan</p>
              <div className="space-y-2">
                {linkedAssignments.map(a => {
                  const label = getDueDateLabel(a.due_date)
                  const sub = submissionMap[a.id]
                  const isDone = sub && (sub.status === 'graded' || sub.status === 'submitted')

                  return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl"
                    >
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900">{a.title}</h4>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          {a.total_points && <span>🏆 {a.total_points} điểm</span>}
                          {a.question_count > 0 && <span>❓ {a.question_count} câu</span>}
                          {label && <span className={label.color}>{label.text}</span>}
                        </div>
                      </div>
                      {isDone ? (
                        <button
                          onClick={() => onViewResult?.(sub.id)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            sub.status === 'graded'
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          }`}
                        >
                          {sub.status === 'graded' ? (
                            <><CheckCircle className="h-4 w-4" /> {sub.score ?? '—'}/{a.total_points}</>
                          ) : (
                            <><Clock className="h-4 w-4" /> Chờ chấm</>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => onTakeAssignment?.(a.id)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors cursor-pointer"
                        >
                          <ClipboardList className="h-4 w-4" />
                          Làm bài
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Completion marker + Navigation */}
          <div className="pt-4 border-t border-gray-200 space-y-4">
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-full text-sm font-medium">
                <CheckCircle className="h-4 w-4" />
                Đã xem bài học
              </div>
            </div>

            {/* Lesson navigation */}
            {allLessons.length > 1 && (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => hasPrev && onNavigate?.(allLessons[currentIndex - 1])}
                  disabled={!hasPrev}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    hasPrev
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Bài trước
                </button>

                <span className="text-xs text-gray-400 font-medium">
                  Bài {currentIndex + 1} / {allLessons.length}
                </span>

                <button
                  onClick={() => hasNext && onNavigate?.(allLessons[currentIndex + 1])}
                  disabled={!hasNext}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    hasNext
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  Bài tiếp theo
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

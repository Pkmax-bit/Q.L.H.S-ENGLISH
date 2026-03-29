import { useCallback, useState, useMemo } from 'react'
import { ClipboardList, Clock, CheckCircle2, AlertTriangle, Timer, Search, BookOpen } from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useFetch } from '../hooks/useFetch'
import { useDebounce } from '../hooks/useDebounce'
import classesService from '../services/classes.service'
import assignmentsService from '../services/assignments.service'
import submissionsService from '../services/submissions.service'
import { formatDate } from '../utils/formatDate'

export default function MyAssignmentsPage() {
  const [filter, setFilter] = useState('all') // all | todo | done | overdue
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  // Fetch my classes
  const fetchClasses = useCallback(() => classesService.getAll(), [])
  const { data: classesData, loading: classesLoading } = useFetch(fetchClasses)
  const classes = Array.isArray(classesData) ? classesData : classesData?.classes || []
  const classIds = classes.map(c => c.id)

  // Fetch assignments for all my classes
  const fetchAssignments = useCallback(() => {
    if (classIds.length === 0) return Promise.resolve({ data: [] })
    return assignmentsService.getAll({ is_published: 'true', limit: 500 })
  }, [classIds.join(',')])
  const { data: assignData, loading: assignLoading } = useFetch(fetchAssignments)
  const allAssignments = Array.isArray(assignData) ? assignData : assignData?.assignments || []

  // Filter only assignments in my classes
  const myAssignments = allAssignments.filter(a => classIds.includes(a.class_id))

  // Fetch my submissions
  const fetchMySubs = useCallback(() => submissionsService.getMy({ limit: 500 }), [])
  const { data: subsData } = useFetch(fetchMySubs)
  const mySubmissions = Array.isArray(subsData) ? subsData : subsData?.submissions || []
  const subMap = useMemo(() => {
    const m = {}; mySubmissions.forEach(s => { m[s.assignment_id] = s }); return m
  }, [mySubmissions])

  const classMap = useMemo(() => {
    const m = {}; classes.forEach(c => { m[c.id] = c }); return m
  }, [classes])

  const now = new Date()

  const enriched = myAssignments.map(a => {
    const sub = subMap[a.id]
    const cls = classMap[a.class_id]
    const isDone = sub && (sub.status === 'submitted' || sub.status === 'graded')
    const isOverdue = a.due_date && new Date(a.due_date) < now && !isDone
    const daysLeft = a.due_date ? Math.ceil((new Date(a.due_date) - now) / (1000 * 60 * 60 * 24)) : null

    return {
      ...a,
      submission: sub || null,
      class_name: cls?.name || '',
      teacher_name: cls?.teacher?.full_name || cls?.teacher_name || '',
      isDone, isOverdue, daysLeft,
    }
  }).sort((a, b) => {
    // Sort: overdue first, then by due date asc, then by created_at desc
    if (a.isOverdue && !b.isOverdue) return -1
    if (!a.isOverdue && b.isOverdue) return 1
    if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date)
    return new Date(b.created_at) - new Date(a.created_at)
  })

  // Apply filters
  const filtered = enriched.filter(a => {
    // Tab filter
    if (filter === 'todo' && a.isDone) return false
    if (filter === 'done' && !a.isDone) return false
    if (filter === 'overdue' && !a.isOverdue) return false

    // Search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      return a.title?.toLowerCase().includes(q) || a.class_name?.toLowerCase().includes(q)
    }
    return true
  })

  const todoCount = enriched.filter(a => !a.isDone).length
  const doneCount = enriched.filter(a => a.isDone).length
  const overdueCount = enriched.filter(a => a.isOverdue).length

  const loading = classesLoading || assignLoading

  if (loading) return <LoadingSpinner message="Đang tải bài tập..." />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📝 Bài tập của tôi</h1>
        <p className="text-sm text-gray-500 mt-1">Danh sách tất cả bài tập trong các lớp bạn tham gia</p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: 'all', label: 'Tất cả', count: enriched.length },
          { key: 'todo', label: '⏳ Chưa làm', count: todoCount },
          { key: 'done', label: '✅ Đã nộp', count: doneCount },
          { key: 'overdue', label: '⚠️ Quá hạn', count: overdueCount },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
              filter === tab.key ? 'bg-white/20' : 'bg-gray-100'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm bài tập..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Assignments */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Không có bài tập nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <div
              key={a.id}
              className={`bg-white rounded-xl border p-4 hover:shadow-md transition-shadow ${
                a.isOverdue ? 'border-red-200 bg-red-50/30' :
                a.isDone ? 'border-green-200' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-gray-900">{a.title}</h3>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      a.assignment_type === 'multiple_choice' ? 'bg-blue-100 text-blue-700' :
                      a.assignment_type === 'essay' ? 'bg-amber-100 text-amber-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {a.assignment_type === 'multiple_choice' ? 'Trắc nghiệm' :
                       a.assignment_type === 'essay' ? 'Tự luận' : 'Kết hợp'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                    <span>📚 {a.class_name}</span>
                    {a.total_points && <span>🏆 {a.total_points} điểm</span>}
                    {a.question_count > 0 && <span>❓ {a.question_count} câu</span>}
                    {a.time_limit_minutes && <span>⏱️ {a.time_limit_minutes} phút</span>}
                  </div>

                  {/* Deadline */}
                  {a.due_date && (
                    <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      a.isOverdue ? 'bg-red-100 border-red-200 text-red-700' :
                      a.daysLeft !== null && a.daysLeft <= 3 ? 'bg-amber-100 border-amber-200 text-amber-700' :
                      'bg-gray-100 border-gray-200 text-gray-600'
                    }`}>
                      {a.isOverdue ? (
                        <><AlertTriangle className="h-3 w-3" /> Hết hạn {formatDate(a.due_date)}</>
                      ) : a.daysLeft !== null && a.daysLeft === 0 ? (
                        <><Timer className="h-3 w-3" /> Hết hạn hôm nay!</>
                      ) : a.daysLeft !== null && a.daysLeft === 1 ? (
                        <><Timer className="h-3 w-3" /> Hết hạn ngày mai</>
                      ) : (
                        <><Clock className="h-3 w-3" /> Hạn: {formatDate(a.due_date)} (còn {a.daysLeft} ngày)</>
                      )}
                    </div>
                  )}
                </div>

                {/* Status / Score */}
                <div className="flex-shrink-0">
                  {a.submission?.status === 'graded' ? (
                    <div className="text-center">
                      <div className={`text-lg font-bold ${
                        a.submission.score / a.total_points >= 0.8 ? 'text-green-600' :
                        a.submission.score / a.total_points >= 0.5 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {a.submission.score}/{a.total_points}
                      </div>
                      <span className="text-xs text-gray-400">Đã chấm</span>
                    </div>
                  ) : a.submission?.status === 'submitted' ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium">
                      <Clock className="h-3.5 w-3.5" /> Chờ chấm
                    </div>
                  ) : a.isOverdue ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium">
                      <AlertTriangle className="h-3.5 w-3.5" /> Quá hạn
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                      <ClipboardList className="h-3.5 w-3.5" /> Chưa làm
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

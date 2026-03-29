import { useCallback, useState } from 'react'
import { Trophy, Clock, CheckCircle, XCircle, BarChart3, Search, Eye } from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useFetch } from '../hooks/useFetch'
import { useDebounce } from '../hooks/useDebounce'
import submissionsService from '../services/submissions.service'
import { formatDate } from '../utils/formatDate'

export default function MyGradesPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const fetchMySubs = useCallback(() => submissionsService.getMy({ limit: 200 }), [])
  const { data: subsData, loading } = useFetch(fetchMySubs)
  const submissions = Array.isArray(subsData) ? subsData : subsData?.submissions || []

  const filtered = submissions.filter(s => {
    if (!debouncedSearch) return true
    const q = debouncedSearch.toLowerCase()
    return (
      s.assignment_title?.toLowerCase().includes(q) ||
      s.class_name?.toLowerCase().includes(q)
    )
  })

  // Stats
  const graded = submissions.filter(s => s.status === 'graded')
  const avgScore = graded.length > 0
    ? (graded.reduce((sum, s) => sum + (parseFloat(s.score) || 0), 0) / graded.length).toFixed(1)
    : null
  const pending = submissions.filter(s => s.status === 'submitted').length

  if (loading) return <LoadingSpinner message="Đang tải điểm số..." />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📊 Điểm số của tôi</h1>
        <p className="text-sm text-gray-500 mt-1">Xem lại kết quả tất cả bài tập đã nộp</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon="📝" label="Đã nộp" value={submissions.length} color="blue" />
        <StatCard icon="✅" label="Đã chấm" value={graded.length} color="green" />
        <StatCard icon="⏳" label="Chờ chấm" value={pending} color="amber" />
        <StatCard icon="📊" label="Điểm TB" value={avgScore || '—'} color="purple" />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên bài tập hoặc lớp..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Submissions list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {submissions.length === 0 ? 'Chưa nộp bài tập nào' : 'Không tìm thấy kết quả'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(sub => {
            const isGraded = sub.status === 'graded'
            const isPending = sub.status === 'submitted'
            const total = sub.assignment_total_points || sub.total_points || 100
            const pct = isGraded && sub.score !== null ? Math.round((sub.score / total) * 100) : null
            const grade = pct !== null ? getGrade(pct) : null

            return (
              <div key={sub.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {sub.assignment_title || 'Bài tập'}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      {sub.class_name && <span>📚 {sub.class_name}</span>}
                      <span>📅 Nộp: {formatDate(sub.submitted_at)}</span>
                      {sub.assignment_type && (
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          {sub.assignment_type === 'multiple_choice' ? 'Trắc nghiệm' :
                           sub.assignment_type === 'essay' ? 'Tự luận' : 'Kết hợp'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    {isGraded && pct !== null ? (
                      <div className="text-center">
                        <div className={`text-xl font-bold ${grade.color}`}>
                          {sub.score}/{total}
                        </div>
                        <div className={`text-xs font-medium mt-0.5 px-2 py-0.5 rounded-full ${grade.bg} ${grade.color}`}>
                          {grade.emoji} {pct}% — {grade.label}
                        </div>
                      </div>
                    ) : isPending ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium">
                        <Clock className="h-4 w-4" /> Chờ chấm
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                        <Eye className="h-4 w-4" /> Đang làm
                      </div>
                    )}
                  </div>
                </div>

                {/* Score bar */}
                {isGraded && pct !== null && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                {sub.feedback && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
                    💬 {sub.feedback}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    purple: 'bg-purple-50 text-purple-700',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-xl font-bold ${colors[color]?.split(' ')[1] || 'text-gray-900'}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}

function getGrade(pct) {
  if (pct >= 90) return { label: 'Xuất sắc', color: 'text-green-600', bg: 'bg-green-100', emoji: '🏆' }
  if (pct >= 75) return { label: 'Giỏi', color: 'text-blue-600', bg: 'bg-blue-100', emoji: '⭐' }
  if (pct >= 50) return { label: 'Khá', color: 'text-amber-600', bg: 'bg-amber-100', emoji: '👍' }
  return { label: 'Cần cố gắng', color: 'text-red-600', bg: 'bg-red-100', emoji: '📚' }
}

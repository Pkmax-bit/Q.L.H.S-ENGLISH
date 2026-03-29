import { useState } from 'react'
import { BarChart3, Search, Download, Trophy, AlertCircle, Minus } from 'lucide-react'
import { useDebounce } from '../../../hooks/useDebounce'

export default function ClassGradesTab({ assignments, gradeMatrix, stats }) {
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)

  const filteredMatrix = gradeMatrix.filter((row) => {
    if (!debouncedSearch) return true
    const q = debouncedSearch.toLowerCase()
    return (
      row.student?.full_name?.toLowerCase().includes(q) ||
      row.student?.email?.toLowerCase().includes(q)
    )
  })

  // Calculate average per student
  const studentsWithAvg = filteredMatrix.map((row) => {
    const scores = Object.values(row.scores).filter(s => s.status === 'graded' && s.score !== null)
    const avg = scores.length > 0
      ? (scores.reduce((sum, s) => sum + s.score, 0) / scores.length).toFixed(1)
      : null
    return { ...row, avg }
  })

  // Sort by avg descending
  const sorted = [...studentsWithAvg].sort((a, b) => {
    if (a.avg === null && b.avg === null) return 0
    if (a.avg === null) return 1
    if (b.avg === null) return -1
    return parseFloat(b.avg) - parseFloat(a.avg)
  })

  if (assignments.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Chưa có bài tập nào</p>
        <p className="text-sm text-gray-400 mt-1">Điểm số sẽ hiển thị khi có bài tập và bài nộp</p>
      </div>
    )
  }

  if (gradeMatrix.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Chưa có học sinh nào</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm học sinh..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Grade table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10 min-w-[50px]">
                  #
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 sticky left-[50px] bg-gray-50 z-10 min-w-[180px]">
                  Học sinh
                </th>
                {assignments.map((a) => (
                  <th key={a.id} className="text-center px-3 py-3 font-medium text-gray-600 min-w-[100px]">
                    <div className="truncate max-w-[120px] mx-auto" title={a.title}>
                      {a.title}
                    </div>
                    <div className="text-xs text-gray-400 font-normal">{a.total_points}đ</div>
                  </th>
                ))}
                <th className="text-center px-4 py-3 font-semibold text-gray-600 min-w-[80px] bg-blue-50">
                  TB
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, idx) => (
                <tr key={row.student?.id || idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 sticky left-0 bg-white z-10">
                    <RankBadge rank={idx + 1} />
                  </td>
                  <td className="px-4 py-3 sticky left-[50px] bg-white z-10">
                    <div>
                      <p className="font-medium text-gray-800">{row.student?.full_name}</p>
                      <p className="text-xs text-gray-400">{row.student?.email || ''}</p>
                    </div>
                  </td>
                  {assignments.map((a) => {
                    const sub = row.scores[a.id]
                    return (
                      <td key={a.id} className="text-center px-3 py-3">
                        <ScoreCell submission={sub} totalPoints={a.total_points} />
                      </td>
                    )
                  })}
                  <td className="text-center px-4 py-3 bg-blue-50/50">
                    {row.avg !== null ? (
                      <span className={`font-bold text-base ${getScoreColor(parseFloat(row.avg))}`}>
                        {row.avg}
                      </span>
                    ) : (
                      <Minus className="h-4 w-4 text-gray-300 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-gray-500 px-2">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-100 border border-green-300" /> Đã chấm
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" /> Đã nộp (chờ chấm)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300" /> Đang làm
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gray-100 border border-gray-300" /> Chưa làm
        </span>
      </div>
    </div>
  )
}

function RankBadge({ rank }) {
  if (rank === 1) return <span className="text-lg">🥇</span>
  if (rank === 2) return <span className="text-lg">🥈</span>
  if (rank === 3) return <span className="text-lg">🥉</span>
  return <span className="text-sm text-gray-500 font-medium">{rank}</span>
}

function ScoreCell({ submission, totalPoints }) {
  if (!submission) {
    return <Minus className="h-4 w-4 text-gray-300 mx-auto" />
  }

  if (submission.status === 'graded') {
    const pct = totalPoints > 0 ? (submission.score / totalPoints * 100) : 0
    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${
        pct >= 80 ? 'bg-green-100 text-green-700' :
        pct >= 50 ? 'bg-amber-100 text-amber-700' :
        'bg-red-100 text-red-700'
      }`}>
        {submission.score}
      </div>
    )
  }

  if (submission.status === 'submitted') {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs bg-amber-100 text-amber-600">
        Chờ chấm
      </span>
    )
  }

  // in_progress
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs bg-blue-100 text-blue-600">
      Đang làm
    </span>
  )
}

function getScoreColor(score) {
  if (score >= 80) return 'text-green-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-600'
}

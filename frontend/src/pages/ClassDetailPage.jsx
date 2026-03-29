import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Info, Users, BookOpen, ClipboardList, BarChart3 } from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import Button from '../components/common/Button'
import ClassOverviewTab from '../components/classes/detail/ClassOverviewTab'
import ClassStudentsTab from '../components/classes/detail/ClassStudentsTab'
import ClassLessonsTab from '../components/classes/detail/ClassLessonsTab'
import ClassAssignmentsTab from '../components/classes/detail/ClassAssignmentsTab'
import ClassGradesTab from '../components/classes/detail/ClassGradesTab'
import { useFetch } from '../hooks/useFetch'
import { useAuth } from '../hooks/useAuth'
import classesService from '../services/classes.service'

const TABS = [
  { key: 'overview', label: 'Tổng quan', icon: Info },
  { key: 'students', label: 'Học sinh', icon: Users },
  { key: 'lessons', label: 'Bài học', icon: BookOpen },
  { key: 'assignments', label: 'Bài tập', icon: ClipboardList },
  { key: 'grades', label: 'Điểm số', icon: BarChart3 },
]

export default function ClassDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const { user } = useAuth()

  const fetchOverview = useCallback(() => classesService.getOverview(id), [id])
  const { data: overview, loading, execute: reload } = useFetch(fetchOverview)

  if (loading) return <LoadingSpinner message="Đang tải thông tin lớp học..." />

  if (!overview) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">Không tìm thấy lớp học</p>
        <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/classes')}>
          Quay lại
        </Button>
      </div>
    )
  }

  const { classInfo, students, lessons, assignments, gradeMatrix, stats } = overview

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/classes')}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{classInfo.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {classInfo.subject_name && <span className="text-blue-600">{classInfo.subject_name}</span>}
              {classInfo.subject_name && classInfo.teacher_name && ' • '}
              {classInfo.teacher_name && <span>GV: {classInfo.teacher_name}</span>}
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          classInfo.status === 'active'
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {classInfo.status === 'active' ? 'Đang hoạt động' : classInfo.status}
        </span>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Học sinh', value: stats.student_count, color: 'blue', icon: '👨‍🎓' },
          { label: 'Bài học', value: stats.lesson_count, color: 'green', icon: '📖' },
          { label: 'Bài tập', value: stats.assignment_count, color: 'purple', icon: '📝' },
          { label: 'Bài nộp', value: stats.total_submissions, color: 'amber', icon: '📤' },
          { label: 'Đã chấm', value: stats.graded_submissions, color: 'teal', icon: '✅' },
          { label: 'Điểm TB', value: stats.avg_score || '—', color: 'red', icon: '📊' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="text-xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            let count = null
            if (tab.key === 'students') count = stats.student_count
            if (tab.key === 'lessons') count = stats.lesson_count
            if (tab.key === 'assignments') count = stats.assignment_count

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {count !== null && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'overview' && (
          <ClassOverviewTab classInfo={classInfo} stats={stats} />
        )}
        {activeTab === 'students' && (
          <ClassStudentsTab
            classId={id}
            students={students}
            onReload={reload}
          />
        )}
        {activeTab === 'lessons' && (
          <ClassLessonsTab lessons={lessons} classId={id} />
        )}
        {activeTab === 'assignments' && (
          <ClassAssignmentsTab assignments={assignments} classId={id} />
        )}
        {activeTab === 'grades' && (
          <ClassGradesTab
            assignments={assignments}
            gradeMatrix={gradeMatrix}
            stats={stats}
          />
        )}
      </div>
    </div>
  )
}

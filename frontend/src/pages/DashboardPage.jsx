import { useCallback } from 'react'
import {
  Users, GraduationCap, School, Wallet, BookOpen, ClipboardList,
  Clock, AlertTriangle, CheckCircle2, BarChart3, Trophy, Calendar
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import DashboardStats from '../components/dashboard/DashboardStats'
import RevenueChart from '../components/dashboard/RevenueChart'
import RecentActivity from '../components/dashboard/RecentActivity'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useFetch } from '../hooks/useFetch'
import { useAuth } from '../hooks/useAuth'
import { formatDate } from '../utils/formatDate'
import api from '../services/api'

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'
  const isTeacher = user?.role === 'teacher'
  const isStudent = user?.role === 'student'

  // Admin dashboard
  const fetchAdminDash = useCallback(() => isAdmin ? api.get('/dashboard/stats') : Promise.resolve({ data: null }), [isAdmin])
  const { data: adminStats, loading: adminLoading } = useFetch(fetchAdminDash)

  const fetchActivity = useCallback(() => isAdmin ? api.get('/dashboard/recent-activity') : Promise.resolve({ data: null }), [isAdmin])
  const { data: activityData } = useFetch(fetchActivity)

  // Teacher dashboard
  const fetchTeacherDash = useCallback(() => isTeacher ? api.get('/dashboard/teacher') : Promise.resolve({ data: null }), [isTeacher])
  const { data: teacherData, loading: teacherLoading } = useFetch(fetchTeacherDash)

  // Student dashboard
  const fetchStudentDash = useCallback(() => isStudent ? api.get('/dashboard/student') : Promise.resolve({ data: null }), [isStudent])
  const { data: studentData, loading: studentLoading } = useFetch(fetchStudentDash)

  const loading = adminLoading || teacherLoading || studentLoading
  if (loading) return <LoadingSpinner message="Đang tải tổng quan..." />

  const roleLabel = { admin: 'Quản trị viên', teacher: 'Giáo viên', student: 'Học sinh' }
  const roleEmoji = { admin: '🔑', teacher: '👨‍🏫', student: '🎓' }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {roleEmoji[user?.role]} Xin chào, {user?.name || 'bạn'}!
        </h1>
        <p className="text-sm text-gray-500 mt-1">{roleLabel[user?.role] || user?.role}</p>
      </div>

      {/* ===== ADMIN DASHBOARD ===== */}
      {isAdmin && (
        <>
          <DashboardStats stats={adminStats || {}} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueChart data={adminStats?.revenueChart || []} />
            <RecentActivity activities={activityData || []} />
          </div>
        </>
      )}

      {/* ===== TEACHER DASHBOARD ===== */}
      {isTeacher && teacherData && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <QuickStat icon="🏫" label="Lớp đang dạy" value={teacherData.stats?.classes || 0} color="blue" />
            <QuickStat icon="👨‍🎓" label="Học sinh" value={teacherData.stats?.students || 0} color="green" />
            <QuickStat icon="📖" label="Bài học" value={teacherData.stats?.lessons || 0} color="purple" />
            <QuickStat icon="📝" label="Bài tập" value={teacherData.stats?.assignments || 0} color="amber" />
            <QuickStat
              icon="📋" label="Chờ chấm" value={teacherData.stats?.pending_grading || 0}
              color={teacherData.stats?.pending_grading > 0 ? 'red' : 'gray'}
              onClick={() => navigate('/submissions')}
            />
            <QuickStat
              icon="📩" label="Yêu cầu thêm HS" value={teacherData.stats?.pending_requests || 0}
              color={teacherData.stats?.pending_requests > 0 ? 'amber' : 'gray'}
              onClick={() => navigate('/enrollment-requests')}
            />
          </div>

          {/* Alert: Pending grading */}
          {teacherData.stats?.pending_grading > 0 && (
            <div
              onClick={() => navigate('/submissions')}
              className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl cursor-pointer hover:bg-red-100 transition-colors"
            >
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700">
                  Có {teacherData.stats.pending_grading} bài nộp chờ chấm điểm
                </p>
                <p className="text-xs text-red-600">Nhấn để vào trang chấm bài</p>
              </div>
            </div>
          )}

          {/* My classes */}
          {teacherData.classes?.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">🏫 Lớp đang dạy</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {teacherData.classes.map(cls => (
                  <div
                    key={cls.id}
                    onClick={() => navigate(`/classes/${cls.id}`)}
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <h3 className="text-sm font-semibold text-gray-900">{cls.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Sĩ số tối đa: {cls.max_students || '—'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== STUDENT DASHBOARD ===== */}
      {isStudent && studentData && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <QuickStat icon="🏫" label="Lớp tham gia" value={studentData.stats?.classes || 0} color="blue" />
            <QuickStat icon="📝" label="Tổng bài tập" value={studentData.stats?.total_assignments || 0} color="purple" />
            <QuickStat
              icon="⏳" label="Chưa làm" value={studentData.stats?.todo_assignments || 0}
              color={studentData.stats?.todo_assignments > 0 ? 'amber' : 'gray'}
              onClick={() => navigate('/my-assignments')}
            />
            <QuickStat
              icon="✅" label="Đã nộp" value={studentData.stats?.completed_assignments || 0}
              color="green"
              onClick={() => navigate('/my-grades')}
            />
            <QuickStat icon="📊" label="Điểm TB" value={studentData.stats?.avg_score || '—'} color="blue" />
            <QuickStat icon="🏆" label="Đã chấm" value={studentData.stats?.graded_count || 0} color="green" />
          </div>

          {/* Alert: Todo assignments */}
          {studentData.stats?.todo_assignments > 0 && (
            <div
              onClick={() => navigate('/my-assignments')}
              className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors"
            >
              <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-700">
                  Bạn còn {studentData.stats.todo_assignments} bài tập chưa làm
                </p>
                <p className="text-xs text-amber-600">Nhấn để xem danh sách bài tập</p>
              </div>
            </div>
          )}

          {/* Upcoming deadlines */}
          {studentData.upcoming_deadlines?.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">⏰ Sắp hết hạn</h2>
              <div className="space-y-2">
                {studentData.upcoming_deadlines.map(d => {
                  const daysLeft = Math.ceil((new Date(d.due_date) - new Date()) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={d.id} className={`flex items-center justify-between p-3 rounded-xl border ${
                      daysLeft <= 1 ? 'bg-red-50 border-red-200' :
                      daysLeft <= 3 ? 'bg-amber-50 border-amber-200' :
                      'bg-white border-gray-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        <ClipboardList className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-800">{d.title}</span>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        daysLeft <= 1 ? 'bg-red-100 text-red-700' :
                        daysLeft <= 3 ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {daysLeft === 0 ? 'Hôm nay!' :
                         daysLeft === 1 ? 'Ngày mai' :
                         `Còn ${daysLeft} ngày`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* My classes */}
          {studentData.classes?.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">📚 Lớp của tôi</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {studentData.classes.map(cls => (
                  <div
                    key={cls.id}
                    onClick={() => navigate(`/classes/${cls.id}`)}
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <h3 className="text-sm font-semibold text-gray-900">{cls.name}</h3>
                    {cls.teacher_name && (
                      <p className="text-xs text-gray-500 mt-1">GV: {cls.teacher_name}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function QuickStat({ icon, label, value, color, onClick }) {
  const colors = {
    blue: 'text-blue-700', green: 'text-green-700', purple: 'text-purple-700',
    amber: 'text-amber-700', red: 'text-red-700', gray: 'text-gray-500',
  }
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-200 p-4 text-center ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-xl font-bold ${colors[color] || 'text-gray-900'}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}

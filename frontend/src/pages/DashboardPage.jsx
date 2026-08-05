import { useCallback } from 'react'
import {
  School, GraduationCap, BookOpen, ClipboardList, Clock, AlertTriangle,
  CheckCircle2, BarChart3, Trophy, FileCheck, UserPlus, ChevronRight,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import DashboardHero from '../components/dashboard/DashboardHero'
import DashboardStats from '../components/dashboard/DashboardStats'
import StatCard from '../components/dashboard/StatCard'
import RevenueChart from '../components/dashboard/RevenueChart'
import RecentActivity from '../components/dashboard/RecentActivity'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useFetch } from '../hooks/useFetch'
import { useAuth } from '../hooks/useAuth'
import api from '../services/api'
import shopService from '../services/shop.service'

function DashboardSection({ title, icon: Icon, children, action }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base sm:text-lg font-semibold text-stone-900 flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-primary-600" />}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function AlertBanner({ tone, icon: Icon, title, subtitle, onClick }) {
  const tones = {
    red: 'bg-red-50/90 border-red-200 text-red-800 hover:bg-red-100/90',
    amber: 'bg-amber-50/90 border-amber-200 text-amber-800 hover:bg-amber-100/90',
    blue: 'bg-blue-50/90 border-blue-200 text-blue-800 hover:bg-blue-100/90',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 p-4 rounded-2xl border transition-colors ${tones[tone]} ${onClick ? 'cursor-pointer' : ''}`}
    >
      <Icon className="h-5 w-5 flex-shrink-0 opacity-80" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {subtitle && <p className="text-xs opacity-80 mt-0.5">{subtitle}</p>}
      </div>
      {onClick && <ChevronRight className="h-4 w-4 opacity-50 shrink-0" />}
    </button>
  )
}

function ClassGrid({ classes, onSelect }) {
  if (!classes?.length) return null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {classes.map((cls) => (
        <button
          key={cls.id}
          type="button"
          onClick={() => onSelect(cls.id)}
          className="app-card-hover p-4 text-left group"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-stone-900 group-hover:text-primary-700 transition-colors">
              {cls.name}
            </h3>
            <ChevronRight className="h-4 w-4 text-stone-300 group-hover:text-primary-400 shrink-0 mt-0.5" />
          </div>
          {cls.teacher_name && (
            <p className="text-xs text-stone-500 mt-2">GV: {cls.teacher_name}</p>
          )}
          {cls.max_students != null && (
            <p className="text-xs text-stone-400 mt-1">Sĩ số tối đa: {cls.max_students}</p>
          )}
        </button>
      ))}
    </div>
  )
}

function DeadlineList({ deadlines }) {
  if (!deadlines?.length) return null
  return (
    <div className="space-y-2">
      {deadlines.map((d) => {
        const daysLeft = Math.ceil((new Date(d.due_date) - new Date()) / (1000 * 60 * 60 * 24))
        const urgent = daysLeft <= 1
        const soon = daysLeft <= 3
        return (
          <div
            key={d.id}
            className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
              urgent ? 'bg-red-50/80 border-red-200' :
              soon ? 'bg-amber-50/80 border-amber-200' :
              'app-card !p-3'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <ClipboardList className="h-4 w-4 text-stone-400 shrink-0" />
              <span className="text-sm font-medium text-stone-800 truncate">{d.title}</span>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
              urgent ? 'bg-red-100 text-red-700' :
              soon ? 'bg-amber-100 text-amber-700' :
              'bg-stone-100 text-stone-600'
            }`}>
              {daysLeft <= 0 ? 'Hôm nay!' :
               daysLeft === 1 ? 'Ngày mai' :
               `Còn ${daysLeft} ngày`}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'
  const isTeacher = user?.role === 'teacher'
  const isStudent = user?.role === 'student'

  const fetchAdminDash = useCallback(
    () => (isAdmin ? api.get('/dashboard/stats') : Promise.resolve({ data: null })),
    [isAdmin]
  )
  const { data: adminStats, loading: adminLoading } = useFetch(fetchAdminDash)

  const fetchActivity = useCallback(
    () => (isAdmin ? api.get('/dashboard/recent-activity') : Promise.resolve({ data: null })),
    [isAdmin]
  )
  const { data: activityData } = useFetch(fetchActivity)

  const fetchTeacherDash = useCallback(
    () => (isTeacher ? api.get('/dashboard/teacher') : Promise.resolve({ data: null })),
    [isTeacher]
  )
  const { data: teacherData, loading: teacherLoading } = useFetch(fetchTeacherDash)

  const fetchStudentDash = useCallback(
    () => (isStudent ? api.get('/dashboard/student') : Promise.resolve({ data: null })),
    [isStudent]
  )
  const { data: studentData, loading: studentLoading } = useFetch(fetchStudentDash)

  const fetchWallet = useCallback(
    () => (isStudent ? shopService.getWallet() : Promise.resolve({ data: null })),
    [isStudent]
  )
  const { data: wallet } = useFetch(fetchWallet)

  const loading = adminLoading || teacherLoading || studentLoading
  if (loading) return <LoadingSpinner message="Đang tải tổng quan..." />

  const streak = isStudent ? studentData?.streak : isTeacher ? teacherData?.streak : null

  return (
    <div className="max-w-[1280px] mx-auto space-y-6 animate-fade-in">
      <DashboardHero user={user} streak={streak} wallet={wallet} />

      {/* ===== ADMIN ===== */}
      {isAdmin && (
        <>
          {(adminStats?.pending_enrollments || 0) > 0 && (
            <AlertBanner
              tone="amber"
              icon={UserPlus}
              title={`${adminStats.pending_enrollments} yêu cầu nhập học chờ duyệt`}
              subtitle="Nhấn để xem và phê duyệt"
              onClick={() => navigate('/enrollment-requests')}
            />
          )}

          <DashboardSection title="Chỉ số tổng quan" icon={BarChart3}>
            <DashboardStats stats={adminStats || {}} onNavigate={navigate} />
          </DashboardSection>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueChart data={adminStats?.revenueChart || []} />
            <RecentActivity activities={activityData || []} />
          </div>
        </>
      )}

      {/* ===== TEACHER ===== */}
      {isTeacher && teacherData && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <StatCard label="Lớp đang dạy" value={teacherData.stats?.classes || 0} icon={School} color="blue" onClick={() => navigate('/classes')} />
            <StatCard label="Học sinh" value={teacherData.stats?.students || 0} icon={GraduationCap} color="green" />
            <StatCard label="Bài học" value={teacherData.stats?.lessons || 0} icon={BookOpen} color="purple" />
            <StatCard label="Bài tập" value={teacherData.stats?.assignments || 0} icon={ClipboardList} color="amber" />
            <StatCard
              label="Chờ chấm"
              value={teacherData.stats?.pending_grading || 0}
              icon={FileCheck}
              color={teacherData.stats?.pending_grading > 0 ? 'red' : 'slate'}
              onClick={() => navigate('/submissions')}
              hint={teacherData.stats?.pending_grading > 0 ? 'Cần xử lý' : undefined}
            />
            <StatCard
              label="Yêu cầu thêm HS"
              value={teacherData.stats?.pending_requests || 0}
              icon={UserPlus}
              color={teacherData.stats?.pending_requests > 0 ? 'orange' : 'slate'}
              onClick={() => navigate('/enrollment-requests')}
            />
          </div>

          {teacherData.stats?.pending_grading > 0 && (
            <AlertBanner
              tone="red"
              icon={AlertTriangle}
              title={`Có ${teacherData.stats.pending_grading} bài nộp chờ chấm điểm`}
              subtitle="Nhấn để vào trang chấm bài"
              onClick={() => navigate('/submissions')}
            />
          )}

          <DashboardSection title="Lớp đang dạy" icon={School}>
            <ClassGrid classes={teacherData.classes} onSelect={(id) => navigate(`/classes/${id}`)} />
          </DashboardSection>
        </>
      )}

      {/* ===== STUDENT ===== */}
      {isStudent && studentData && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <StatCard label="Lớp tham gia" value={studentData.stats?.classes || 0} icon={School} color="blue" onClick={() => navigate('/learning')} />
            <StatCard label="Tổng bài tập" value={studentData.stats?.total_assignments || 0} icon={ClipboardList} color="purple" />
            <StatCard
              label="Chưa làm"
              value={studentData.stats?.todo_assignments || 0}
              icon={Clock}
              color={studentData.stats?.todo_assignments > 0 ? 'amber' : 'slate'}
              onClick={() => navigate('/my-assignments')}
            />
            <StatCard
              label="Đã nộp"
              value={studentData.stats?.completed_assignments || 0}
              icon={CheckCircle2}
              color="green"
              onClick={() => navigate('/my-grades')}
            />
            <StatCard label="Điểm TB" value={studentData.stats?.avg_score ?? '—'} icon={BarChart3} color="blue" />
            <StatCard label="Đã chấm" value={studentData.stats?.graded_count || 0} icon={Trophy} color="green" />
          </div>

          {studentData.stats?.todo_assignments > 0 && (
            <AlertBanner
              tone="amber"
              icon={Clock}
              title={`Bạn còn ${studentData.stats.todo_assignments} bài tập chưa làm`}
              subtitle="Nhấn để xem danh sách bài tập"
              onClick={() => navigate('/my-assignments')}
            />
          )}

          {!studentData.streak?.active_today && (
            <AlertBanner
              tone="blue"
              icon={Trophy}
              title="Học hôm nay để giữ chuỗi lửa!"
              subtitle="Làm bài tập hoặc tham gia buổi học để tính vào chuỗi"
              onClick={() => navigate('/my-assignments')}
            />
          )}

          {studentData.upcoming_deadlines?.length > 0 && (
            <DashboardSection title="Sắp hết hạn" icon={Clock}>
              <DeadlineList deadlines={studentData.upcoming_deadlines} />
            </DashboardSection>
          )}

          <DashboardSection title="Lớp của tôi" icon={BookOpen}>
            <ClassGrid classes={studentData.classes} onSelect={(id) => navigate(`/classes/${id}`)} />
          </DashboardSection>
        </>
      )}
    </div>
  )
}

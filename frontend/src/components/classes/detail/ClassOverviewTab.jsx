import { Calendar, Users, FileText, BookOpen, MessageCircle, DollarSign, ArrowRight } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { formatDate } from '../../../utils/formatDate'
import { useAuth } from '../../../hooks/useAuth'
import { useMessenger } from '../../../context/MessengerContext'
import { ToastContext } from '../../../context/ToastContext'
import { useContext } from 'react'
import UserAvatar from '../../common/UserAvatar'

export default function ClassOverviewTab({ classInfo, stats, forStudent = false, onReload }) {
  const { user } = useAuth()
  const { id: classIdFromRoute } = useParams()
  const navigate = useNavigate()
  const { error: showError } = useContext(ToastContext)
  const { ensureClassChat, openDock, createDirect, refreshGroups } = useMessenger()
  const showStaffFinance = !forStudent && (user?.role === 'admin' || user?.role === 'teacher')
  const canMessageTeacher = forStudent
    && classInfo.teacher_id
    && String(classInfo.teacher_id) !== String(user?.id)

  const openClassChat = async () => {
    try {
      const group = await ensureClassChat(classInfo.id)
      navigate(`/messenger?group=${group.id}`)
      openDock(group)
    } catch (err) {
      showError(err.response?.data?.message || 'Không mở được chat lớp')
    }
  }

  const messageTeacher = async () => {
    if (!classInfo.teacher_id) return
    try {
      const group = await createDirect(classInfo.teacher_id)
      await refreshGroups()
      navigate(`/messenger?group=${group.id}`)
      openDock(group)
    } catch (err) {
      showError(err.response?.data?.message || 'Không mở được chat với giáo viên')
    }
  }

  return (
    <div className="space-y-6">
    <div className="flex justify-end gap-2 flex-wrap">
      {canMessageTeacher && (
        <button
          type="button"
          onClick={messageTeacher}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-sm transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          Nhắn tin giáo viên
        </button>
      )}
      <button
        type="button"
        onClick={openClassChat}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm transition-colors"
      >
        <MessageCircle className="h-4 w-4" />
        Chat lớp học
      </button>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Class info card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="h-5 w-5 text-amber-600" />
          Thông tin lớp học
        </h3>

        <div className="space-y-3">
          <InfoRow icon={BookOpen} label="Tên lớp" value={classInfo.name} />
          <InfoRow icon={FileText} label="Môn học" value={classInfo.subject_name || '—'} />
          <div className="flex items-center gap-3">
            <UserAvatar
              name={classInfo.teacher_name}
              avatarUrl={classInfo.teacher_avatar_url}
              size="sm"
            />
            <span className="text-sm text-gray-500 w-20 flex-shrink-0">Giáo viên</span>
            <span className="text-sm font-medium text-gray-800">{classInfo.teacher_name || '—'}</span>
          </div>
          {classInfo.teacher_email && (
            <InfoRow icon={null} label="Email GV" value={classInfo.teacher_email} />
          )}
          {classInfo.teacher_phone && (
            <InfoRow icon={null} label="SĐT GV" value={classInfo.teacher_phone} />
          )}
          <InfoRow
            icon={Users}
            label="Sĩ số"
            value={`${stats.student_count}${classInfo.max_students ? ` / ${classInfo.max_students}` : ''} học sinh`}
          />
          <InfoRow
            icon={Calendar}
            label="Thời gian"
            value={`${formatDate(classInfo.start_date) || '—'} ${classInfo.end_date ? '— ' + formatDate(classInfo.end_date) : ''}`}
          />
        </div>

        {classInfo.description && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-600 mb-1">Mô tả</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{classInfo.description}</p>
          </div>
        )}
      </div>

      {/* Stats — học sinh chỉ thấy bài học / bài tập (không xem thống kê chấm cả lớp) */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          {forStudent ? '📌 Trong lớp này' : '📊 Thống kê tổng quan'}
        </h3>

        <div className="space-y-3">
          <StatRow
            label="Bài học"
            value={stats.lesson_count}
            description={forStudent ? 'được đăng trong lớp' : 'bài học đã tạo'}
            color="green"
          />
          <StatRow
            label="Bài tập"
            value={stats.assignment_count}
            description={forStudent ? 'được giao — làm trong tab Bài tập' : 'bài tập đã giao'}
            color="purple"
          />
          {!forStudent && (
            <>
              <StatRow
                label="Bài nộp"
                value={stats.total_submissions}
                description="lần nộp bài"
                color="amber"
              />
              <StatRow
                label="Đã chấm"
                value={stats.graded_submissions}
                description={`/ ${stats.total_submissions} bài nộp`}
                color="teal"
              />
              <StatRow
                label="Điểm TB"
                value={stats.avg_score || '—'}
                description="điểm trung bình lớp"
                color="red"
              />
            </>
          )}
        </div>

        {!forStudent && stats.total_submissions > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Tiến độ chấm bài</span>
              <span>{stats.graded_submissions}/{stats.total_submissions}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-teal-500 h-2 rounded-full transition-all"
                style={{ width: `${(stats.graded_submissions / stats.total_submissions * 100).toFixed(0)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>

    {showStaffFinance && (
      <button
        type="button"
        onClick={() => navigate(`/classes/${classIdFromRoute || classInfo.id}?tab=tuition`)}
        className="w-full flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-5 py-4 text-left hover:bg-emerald-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <DollarSign className="h-6 w-6 text-emerald-600 shrink-0" />
          <div>
            <div className="font-semibold text-gray-900">Học phí &amp; lịch đóng phí</div>
            <div className="text-xs text-gray-600 mt-0.5">
              Xem số buổi theo lịch, lịch trình đóng phí, đã thu và còn nợ
            </div>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-emerald-600 shrink-0" />
      </button>
    )}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      {Icon && <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />}
      {!Icon && <div className="w-4" />}
      <span className="text-sm text-gray-500 w-20 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  )
}

function StatRow({ label, value, description, color }) {
  const colors = {
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    amber: 'bg-amber-100 text-amber-700',
    teal: 'bg-teal-100 text-teal-700',
    red: 'bg-red-100 text-red-700',
  }

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <span className={`px-3 py-1 rounded-lg text-lg font-bold ${colors[color] || colors.green}`}>
        {value}
      </span>
    </div>
  )
}

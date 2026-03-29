import { Calendar, User, Users, MapPin, FileText, BookOpen, ClipboardList } from 'lucide-react'
import { formatDate } from '../../../utils/formatDate'

export default function ClassOverviewTab({ classInfo, stats }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Class info card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          Thông tin lớp học
        </h3>

        <div className="space-y-3">
          <InfoRow icon={BookOpen} label="Tên lớp" value={classInfo.name} />
          <InfoRow icon={FileText} label="Môn học" value={classInfo.subject_name || '—'} />
          <InfoRow icon={User} label="Giáo viên" value={classInfo.teacher_name || '—'} />
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

      {/* Stats summary card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          📊 Thống kê tổng quan
        </h3>

        <div className="space-y-3">
          <StatRow
            label="Bài học"
            value={stats.lesson_count}
            description="bài học đã tạo"
            color="green"
          />
          <StatRow
            label="Bài tập"
            value={stats.assignment_count}
            description="bài tập đã giao"
            color="purple"
          />
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
        </div>

        {/* Progress bar */}
        {stats.total_submissions > 0 && (
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

import Modal from '../common/Modal'
import StatusBadge from '../common/StatusBadge'
import UserAvatar from '../common/UserAvatar'
import { formatDate } from '../../utils/formatDate'
import { Mail, Phone, Calendar } from 'lucide-react'

export default function TeacherDetail({ isOpen, onClose, teacher }) {
  if (!teacher) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chi tiết giáo viên" size="md">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <UserAvatar name={teacher.full_name} avatarUrl={teacher.avatar_url} size="lg" />
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-gray-900 truncate">{teacher.full_name}</h3>
              <p className="text-sm text-gray-500">Giáo viên</p>
            </div>
          </div>
          <StatusBadge status={teacher.is_active === false ? 'inactive' : 'active'} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="text-gray-700">{teacher.email || '—'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Phone className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="text-gray-700">{teacher.phone || '—'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="text-gray-700">Ngày tạo: {formatDate(teacher.created_at)}</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}

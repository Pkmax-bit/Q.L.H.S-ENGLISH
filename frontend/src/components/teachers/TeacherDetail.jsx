import Modal from '../common/Modal'
import StatusBadge from '../common/StatusBadge'
import { formatDate } from '../../utils/formatDate'
import { Mail, Phone, Calendar, Image } from 'lucide-react'

export default function TeacherDetail({ isOpen, onClose, teacher }) {
  if (!teacher) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chi tiết giáo viên" size="md">
      <div className="space-y-4">
        {/* Name and status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {teacher.avatar_url ? (
              <img
                src={teacher.avatar_url}
                alt={teacher.full_name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg">
                {teacher.full_name?.charAt(0) || '?'}
              </div>
            )}
            <h3 className="text-xl font-bold text-gray-900">{teacher.full_name}</h3>
          </div>
          <StatusBadge status={teacher.is_active === false ? 'inactive' : 'active'} />
        </div>

        {/* Info rows */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-gray-400" />
            <span className="text-gray-700">{teacher.email || '—'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Phone className="h-4 w-4 text-gray-400" />
            <span className="text-gray-700">{teacher.phone || '—'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-700">Ngày tạo: {formatDate(teacher.created_at)}</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}

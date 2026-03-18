import Modal from '../common/Modal'
import StatusBadge from '../common/StatusBadge'
import { formatDate } from '../../utils/formatDate'
import { Mail, Phone, MapPin, BookOpen, Calendar } from 'lucide-react'

export default function TeacherDetail({ isOpen, onClose, teacher }) {
  if (!teacher) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chi tiết giáo viên" size="md">
      <div className="space-y-4">
        {/* Name and status */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">{teacher.name}</h3>
          <StatusBadge status={teacher.status || 'active'} />
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
            <BookOpen className="h-4 w-4 text-gray-400" />
            <span className="text-gray-700">{teacher.specialization || '—'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-gray-700">{teacher.address || '—'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-700">Ngày tạo: {formatDate(teacher.createdAt)}</span>
          </div>
        </div>

        {/* Notes */}
        {teacher.notes && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-600 mb-1">Ghi chú</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{teacher.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}

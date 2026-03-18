import Modal from '../common/Modal'
import StatusBadge from '../common/StatusBadge'
import { formatDate } from '../../utils/formatDate'
import { Mail, Phone, Calendar } from 'lucide-react'

export default function StudentDetail({ isOpen, onClose, student }) {
  if (!student) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chi tiết học sinh" size="md">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {student.avatar_url ? (
              <img
                src={student.avatar_url}
                alt={student.full_name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg">
                {student.full_name?.charAt(0) || '?'}
              </div>
            )}
            <h3 className="text-xl font-bold text-gray-900">{student.full_name}</h3>
          </div>
          <StatusBadge status={student.is_active === false ? 'inactive' : 'active'} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-gray-400" />
            <span className="text-gray-700">{student.email || '—'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Phone className="h-4 w-4 text-gray-400" />
            <span className="text-gray-700">{student.phone || '—'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-700">Ngày tạo: {formatDate(student.created_at)}</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}

import Modal from '../common/Modal'
import StatusBadge from '../common/StatusBadge'
import { formatDate } from '../../utils/formatDate'
import { Mail, Phone, MapPin, Calendar, User, Users } from 'lucide-react'

export default function StudentDetail({ isOpen, onClose, student }) {
  if (!student) return null

  const genderLabel = { male: 'Nam', female: 'Nữ', other: 'Khác' }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chi tiết học sinh" size="md">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">{student.name}</h3>
          <StatusBadge status={student.status || 'active'} />
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
            <span className="text-gray-700">Ngày sinh: {formatDate(student.dateOfBirth) || '—'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <User className="h-4 w-4 text-gray-400" />
            <span className="text-gray-700">Giới tính: {genderLabel[student.gender] || '—'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-gray-700">{student.address || '—'}</span>
          </div>
        </div>

        {/* Parent info */}
        <div className="pt-3 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-600 mb-2">Thông tin phụ huynh</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-gray-700">{student.parentName || '—'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-gray-700">{student.parentPhone || '—'}</span>
            </div>
          </div>
        </div>

        {student.notes && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-600 mb-1">Ghi chú</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{student.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}

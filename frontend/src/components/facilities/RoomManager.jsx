import { useState, useContext, useMemo } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import StatusBadge from '../common/StatusBadge'
import ConfirmDialog from '../common/ConfirmDialog'
import FacilityForm from './FacilityForm'
import { ToastContext } from '../../context/ToastContext'
import facilitiesService from '../../services/facilities.service'

const typeLabels = {
  building: 'Tòa nhà',
  classroom: 'Phòng học',
  lab: 'Phòng thí nghiệm',
}

export default function RoomManager({ isOpen, onClose, facility, allFacilities = [], onReload }) {
  const [showForm, setShowForm] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { success, error: showError } = useContext(ToastContext)

  // Get sub-facilities (rooms) that have parent_id === this facility's id
  const rooms = useMemo(() => {
    if (!facility) return []
    return allFacilities.filter((f) => f.parent_id === facility.id)
  }, [facility, allFacilities])

  const handleEditRoom = (room) => {
    setSelectedRoom(room)
    setShowForm(true)
  }

  const handleDeleteRoom = (room) => {
    setSelectedRoom(room)
    setShowDelete(true)
  }

  const confirmDeleteRoom = async () => {
    setDeleting(true)
    try {
      await facilitiesService.delete(selectedRoom.id)
      success('Xóa phòng thành công')
      if (onReload) onReload()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa phòng thất bại')
    } finally {
      setDeleting(false)
      setShowDelete(false)
      setSelectedRoom(null)
    }
  }

  if (!facility) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Phòng — ${facility.name}`} size="xl">
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">{rooms.length} phòng</p>
          <Button
            size="sm"
            icon={Plus}
            onClick={() => { setSelectedRoom(null); setShowForm(true) }}
          >
            Thêm phòng
          </Button>
        </div>

        {rooms.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Chưa có phòng nào</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Tên phòng</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Loại</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Sức chứa</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Trang thiết bị</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id} className="border-b border-gray-100 hover:bg-blue-50/30">
                    <td className="px-4 py-3 font-medium text-gray-700">{room.name}</td>
                    <td className="px-4 py-3 text-gray-600">{typeLabels[room.type] || room.type || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{room.capacity ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{room.equipment || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={room.status || 'active'} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEditRoom(room)}
                          className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-500 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(room)}
                          className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Room form uses FacilityForm with parentId */}
      <FacilityForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setSelectedRoom(null) }}
        facility={selectedRoom}
        parentId={facility.id}
        onSuccess={() => {
          setShowForm(false)
          setSelectedRoom(null)
          if (onReload) onReload()
        }}
      />

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => { setShowDelete(false); setSelectedRoom(null) }}
        onConfirm={confirmDeleteRoom}
        loading={deleting}
        title="Xóa phòng"
        message={`Bạn có chắc chắn muốn xóa phòng "${selectedRoom?.name}"?`}
      />
    </Modal>
  )
}

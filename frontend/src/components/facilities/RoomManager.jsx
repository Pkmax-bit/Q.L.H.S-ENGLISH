import { useState, useEffect, useContext, useCallback } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Select from '../common/Select'
import Button from '../common/Button'
import StatusBadge from '../common/StatusBadge'
import ConfirmDialog from '../common/ConfirmDialog'
import LoadingSpinner from '../common/LoadingSpinner'
import { useFetch } from '../../hooks/useFetch'
import { ToastContext } from '../../context/ToastContext'
import facilitiesService from '../../services/facilities.service'
import { validateForm, required, positiveNumber } from '../../utils/validators'

const initialRoomForm = {
  name: '',
  capacity: '',
  equipment: '',
  status: 'active',
}

export default function RoomManager({ isOpen, onClose, facility }) {
  const [showRoomForm, setShowRoomForm] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [form, setForm] = useState(initialRoomForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { success, error: showError } = useContext(ToastContext)

  const facilityId = facility?._id || facility?.id

  const fetchRooms = useCallback(() => {
    if (facilityId) return facilitiesService.getRooms(facilityId)
    return Promise.resolve({ data: [] })
  }, [facilityId])

  const { data: roomsData, loading: roomsLoading, execute: reloadRooms } = useFetch(
    fetchRooms, [facilityId], !!facilityId
  )
  const rooms = Array.isArray(roomsData) ? roomsData : roomsData?.rooms || []

  useEffect(() => {
    if (selectedRoom) {
      setForm({
        name: selectedRoom.name || '',
        capacity: selectedRoom.capacity ?? '',
        equipment: selectedRoom.equipment || '',
        status: selectedRoom.status || 'active',
      })
    } else {
      setForm(initialRoomForm)
    }
    setErrors({})
  }, [selectedRoom, showRoomForm])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const validate = () => {
    return validateForm({
      name: [() => required(form.name, 'Tên phòng')],
      capacity: [() => positiveNumber(form.capacity, 'Sức chứa')],
    })
  }

  const handleSubmitRoom = async (e) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    try {
      const payload = {
        ...form,
        capacity: form.capacity !== '' ? Number(form.capacity) : undefined,
      }
      if (selectedRoom) {
        await facilitiesService.updateRoom(facilityId, selectedRoom._id || selectedRoom.id, payload)
        success('Cập nhật phòng học thành công')
      } else {
        await facilitiesService.createRoom(facilityId, payload)
        success('Thêm phòng học thành công')
      }
      setShowRoomForm(false)
      setSelectedRoom(null)
      reloadRooms()
    } catch (err) {
      showError(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  const handleEditRoom = (room) => {
    setSelectedRoom(room)
    setShowRoomForm(true)
  }

  const handleDeleteRoom = (room) => {
    setSelectedRoom(room)
    setShowDelete(true)
  }

  const confirmDeleteRoom = async () => {
    setDeleting(true)
    try {
      await facilitiesService.deleteRoom(facilityId, selectedRoom._id || selectedRoom.id)
      success('Xóa phòng học thành công')
      reloadRooms()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa phòng học thất bại')
    } finally {
      setDeleting(false)
      setShowDelete(false)
      setSelectedRoom(null)
    }
  }

  if (!facility) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Phòng học — ${facility.name}`} size="xl">
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">{rooms.length} phòng học</p>
          <Button
            size="sm"
            icon={Plus}
            onClick={() => { setSelectedRoom(null); setShowRoomForm(true) }}
          >
            Thêm phòng
          </Button>
        </div>

        {roomsLoading ? (
          <LoadingSpinner />
        ) : rooms.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Chưa có phòng học nào</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Tên phòng</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Sức chứa</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Trang thiết bị</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room._id || room.id} className="border-b border-gray-100 hover:bg-blue-50/30">
                    <td className="px-4 py-3 font-medium text-gray-700">{room.name}</td>
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

      {/* Room form modal */}
      {showRoomForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedRoom ? 'Chỉnh sửa phòng' : 'Thêm phòng mới'}
              </h3>
            </div>
            <form onSubmit={handleSubmitRoom} className="px-6 py-4 space-y-4">
              <Input
                label="Tên phòng"
                name="name"
                value={form.name}
                onChange={handleChange}
                error={errors.name}
                placeholder="Phòng 101"
                required
              />
              <Input
                label="Sức chứa"
                name="capacity"
                type="number"
                value={form.capacity}
                onChange={handleChange}
                error={errors.capacity}
                placeholder="30"
              />
              <Input
                label="Trang thiết bị"
                name="equipment"
                value={form.equipment}
                onChange={handleChange}
                placeholder="Máy chiếu, bảng trắng..."
              />
              <Select
                label="Trạng thái"
                name="status"
                value={form.status}
                onChange={handleChange}
                options={[
                  { value: 'active', label: 'Hoạt động' },
                  { value: 'inactive', label: 'Ngừng sử dụng' },
                ]}
              />
            </form>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <Button variant="outline" onClick={() => { setShowRoomForm(false); setSelectedRoom(null) }} disabled={loading}>
                Hủy
              </Button>
              <Button onClick={handleSubmitRoom} loading={loading}>
                {selectedRoom ? 'Cập nhật' : 'Thêm mới'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => { setShowDelete(false); setSelectedRoom(null) }}
        onConfirm={confirmDeleteRoom}
        loading={deleting}
        title="Xóa phòng học"
        message={`Bạn có chắc chắn muốn xóa phòng "${selectedRoom?.name}"?`}
      />
    </Modal>
  )
}

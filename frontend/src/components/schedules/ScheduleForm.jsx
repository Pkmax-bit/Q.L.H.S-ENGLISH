import { useState, useEffect, useContext, useCallback, useMemo } from 'react'
import Modal from '../common/Modal'
import Select from '../common/Select'
import Button from '../common/Button'
import { ToastContext } from '../../context/ToastContext'
import { useFetch } from '../../hooks/useFetch'
import schedulesService from '../../services/schedules.service'
import classesService from '../../services/classes.service'
import facilitiesService from '../../services/facilities.service'
import { validateForm, required } from '../../utils/validators'
import { AlertTriangle, Building2, DoorOpen } from 'lucide-react'

const DAY_OPTIONS = [
  { value: '1', label: 'Thứ 2' },
  { value: '2', label: 'Thứ 3' },
  { value: '3', label: 'Thứ 4' },
  { value: '4', label: 'Thứ 5' },
  { value: '5', label: 'Thứ 6' },
  { value: '6', label: 'Thứ 7' },
  { value: '0', label: 'Chủ nhật' },
]

const TIME_OPTIONS = Array.from({ length: 30 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7
  const min = i % 2 === 0 ? '00' : '30'
  const label = `${String(hour).padStart(2, '0')}:${min}`
  return { value: label, label }
})

const initialForm = {
  class_id: '',
  facility_id: '', // cơ sở cha
  room_id: '',
  day_of_week: '',
  start_time: '',
  end_time: '',
}

export default function ScheduleForm({
  isOpen,
  onClose,
  schedule,
  defaultDay,
  defaultHour,
  existingSlots = [],
  onSuccess,
}) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const isEdit = !!schedule

  const fetchClasses = useCallback(() => classesService.getAll(), [])
  const fetchFacilities = useCallback(() => facilitiesService.getAll({ limit: 100 }), [])

  const { data: classesData } = useFetch(fetchClasses)
  const { data: facilitiesData } = useFetch(fetchFacilities)

  const classes = Array.isArray(classesData) ? classesData : classesData?.classes || []
  const facilities = Array.isArray(facilitiesData) ? facilitiesData : facilitiesData?.facilities || []

  // Separate buildings (parents) and rooms (children)
  const buildings = facilities.filter((f) => f.type === 'building' || (!f.parent_id && f.type !== 'classroom' && f.type !== 'lab'))
  const allRooms = facilities.filter((f) => f.parent_id || f.type === 'classroom' || f.type === 'lab')

  // Filter rooms by selected building
  const filteredRooms = form.facility_id
    ? allRooms.filter((r) => r.parent_id === form.facility_id)
    : allRooms

  const buildingOptions = buildings.map((b) => ({ value: b.id, label: `🏢 ${b.name}` }))
  const roomOptions = filteredRooms.map((r) => ({
    value: r.id,
    label: `${r.type === 'lab' ? '🔬' : '🚪'} ${r.name}${r.capacity ? ` (${r.capacity} chỗ)` : ''}`,
  }))

  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }))

  // When editing, find the building from room's parent_id
  useEffect(() => {
    if (schedule) {
      const roomId = schedule.room_id || schedule.room?.id || ''
      const room = facilities.find((f) => f.id === roomId)
      setForm({
        class_id: schedule.class_id || schedule.class?.id || '',
        facility_id: room?.parent_id || '',
        room_id: roomId,
        day_of_week: String(schedule.day_of_week ?? ''),
        start_time: schedule.start_time ? schedule.start_time.substring(0, 5) : '',
        end_time: schedule.end_time ? schedule.end_time.substring(0, 5) : '',
      })
    } else {
      const startHour = defaultHour != null ? `${String(defaultHour).padStart(2, '0')}:00` : ''
      const endHour = defaultHour != null ? `${String(defaultHour + 1).padStart(2, '0')}:00` : ''
      setForm({
        ...initialForm,
        day_of_week: defaultDay != null ? String(defaultDay) : '',
        start_time: startHour,
        end_time: endHour,
      })
    }
    setErrors({})
  }, [schedule, defaultDay, defaultHour, isOpen, facilities])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      // Reset room when building changes
      if (name === 'facility_id') {
        next.room_id = ''
      }
      return next
    })
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  // Conflict detection
  const conflicts = useMemo(() => {
    if (!form.day_of_week || !form.start_time || !form.end_time) return []
    const day = Number(form.day_of_week)
    const slotId = schedule?.id

    return existingSlots.filter((s) => {
      if (s.id === slotId) return false
      const sDay = s.day_of_week
      // Compare time strings
      return sDay === day && form.start_time < (s.end_time || '').substring(0, 5) && form.end_time > (s.start_time || '').substring(0, 5)
    })
  }, [form, existingSlots, schedule])

  const validate = () => {
    return validateForm({
      class_id: [() => required(form.class_id, 'Lớp học')],
      day_of_week: [() => required(form.day_of_week, 'Ngày')],
      start_time: [() => required(form.start_time, 'Giờ bắt đầu')],
      end_time: [() => required(form.end_time, 'Giờ kết thúc')],
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    if (form.end_time <= form.start_time) {
      setErrors({ end_time: 'Giờ kết thúc phải sau giờ bắt đầu' })
      return
    }

    setLoading(true)
    try {
      const payload = {
        class_id: form.class_id,
        day_of_week: Number(form.day_of_week),
        start_time: form.start_time,
        end_time: form.end_time,
        room_id: form.room_id || undefined,
      }
      if (isEdit) {
        await schedulesService.update(schedule.id, payload)
        success('Cập nhật lịch học thành công')
      } else {
        await schedulesService.create(payload)
        success('Thêm lịch học thành công')
      }
      onSuccess()
    } catch (err) {
      showError(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!schedule) return
    setDeleteLoading(true)
    try {
      await schedulesService.delete(schedule.id)
      success('Xóa lịch học thành công')
      onSuccess()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa lịch học thất bại')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Chỉnh sửa lịch học' : 'Thêm lịch học mới'}
      size="lg"
      footer={
        <>
          {isEdit && (
            <Button variant="danger" onClick={handleDelete} loading={deleteLoading} className="mr-auto">
              Xóa
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            {isEdit ? 'Cập nhật' : 'Thêm mới'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {conflicts.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Cảnh báo trùng lịch!</p>
              <p className="mt-0.5">
                Có {conflicts.length} lịch học trùng thời gian tại khung giờ này.
              </p>
            </div>
          </div>
        )}

        <Select
          label="Lớp học"
          name="class_id"
          value={form.class_id}
          onChange={handleChange}
          options={classOptions}
          placeholder="Chọn lớp học"
          error={errors.class_id}
          required
        />

        <Select
          label="Ngày trong tuần"
          name="day_of_week"
          value={form.day_of_week}
          onChange={handleChange}
          options={DAY_OPTIONS}
          placeholder="Chọn ngày"
          error={errors.day_of_week}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Giờ bắt đầu"
            name="start_time"
            value={form.start_time}
            onChange={handleChange}
            options={TIME_OPTIONS}
            placeholder="Chọn giờ"
            error={errors.start_time}
            required
          />
          <Select
            label="Giờ kết thúc"
            name="end_time"
            value={form.end_time}
            onChange={handleChange}
            options={TIME_OPTIONS}
            placeholder="Chọn giờ"
            error={errors.end_time}
            required
          />
        </div>

        {/* Location: Building → Room */}
        <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50/50">
          <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Địa điểm
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <Building2 className="h-5 w-5 text-blue-500 mt-7 flex-shrink-0" />
              <Select
                label="Cơ sở"
                name="facility_id"
                value={form.facility_id}
                onChange={handleChange}
                options={buildingOptions}
                placeholder="Chọn cơ sở trước..."
              />
            </div>
            <div className="flex items-start gap-2">
              <DoorOpen className="h-5 w-5 text-green-500 mt-7 flex-shrink-0" />
              <Select
                label="Phòng học"
                name="room_id"
                value={form.room_id}
                onChange={handleChange}
                options={roomOptions}
                placeholder={form.facility_id ? 'Chọn phòng...' : 'Chọn cơ sở trước'}
                disabled={!form.facility_id && buildings.length > 0}
              />
            </div>
          </div>
          {form.facility_id && roomOptions.length === 0 && (
            <p className="text-xs text-amber-600">Cơ sở này chưa có phòng học nào.</p>
          )}
        </div>
      </form>
    </Modal>
  )
}

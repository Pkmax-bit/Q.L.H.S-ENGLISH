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
import { AlertTriangle } from 'lucide-react'

const DAY_OPTIONS = [
  { value: '1', label: 'Thứ 2' },
  { value: '2', label: 'Thứ 3' },
  { value: '3', label: 'Thứ 4' },
  { value: '4', label: 'Thứ 5' },
  { value: '5', label: 'Thứ 6' },
  { value: '6', label: 'Thứ 7' },
  { value: '0', label: 'Chủ nhật' },
]

const HOUR_OPTIONS = Array.from({ length: 15 }, (_, i) => ({
  value: String(i + 7),
  label: `${String(i + 7).padStart(2, '0')}:00`,
}))

const initialForm = {
  class_id: '',
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
  const fetchFacilities = useCallback(() => facilitiesService.getAll(), [])

  const { data: classesData } = useFetch(fetchClasses)
  const { data: facilitiesData } = useFetch(fetchFacilities)

  const classes = Array.isArray(classesData) ? classesData : classesData?.classes || []
  const facilities = Array.isArray(facilitiesData) ? facilitiesData : facilitiesData?.facilities || []

  // All facilities can serve as rooms (hierarchical: classrooms and labs are sub-facilities)
  const roomOptions = facilities
    .filter((f) => f.type === 'classroom' || f.type === 'lab' || !f.parent_id === false)
    .map((f) => ({ value: f.id, label: f.name }))

  // If no sub-facilities found, list all facilities as room options
  const finalRoomOptions = roomOptions.length > 0
    ? roomOptions
    : facilities.map((f) => ({ value: f.id, label: f.name }))

  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }))

  useEffect(() => {
    if (schedule) {
      setForm({
        class_id: schedule.class_id || schedule.class?.id || '',
        room_id: schedule.room_id || schedule.room?.id || '',
        day_of_week: String(schedule.day_of_week ?? ''),
        start_time: String(schedule.start_time || ''),
        end_time: String(schedule.end_time || ''),
      })
    } else {
      setForm({
        ...initialForm,
        day_of_week: defaultDay != null ? String(defaultDay) : '',
        start_time: defaultHour != null ? String(defaultHour) : '',
        end_time: defaultHour != null ? String(defaultHour + 1) : '',
      })
    }
    setErrors({})
  }, [schedule, defaultDay, defaultHour, isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  // Conflict detection
  const conflicts = useMemo(() => {
    if (!form.day_of_week || !form.start_time || !form.end_time) return []
    const day = Number(form.day_of_week)
    const start = Number(form.start_time)
    const end = Number(form.end_time)
    const slotId = schedule?.id

    return existingSlots.filter((s) => {
      if (s.id === slotId) return false
      const sDay = s.day_of_week
      const sStart = Number(s.start_time)
      const sEnd = Number(s.end_time)
      return sDay === day && start < sEnd && end > sStart
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

    if (Number(form.end_time) <= Number(form.start_time)) {
      setErrors({ end_time: 'Giờ kết thúc phải sau giờ bắt đầu' })
      return
    }

    setLoading(true)
    try {
      const payload = {
        ...form,
        day_of_week: Number(form.day_of_week),
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
      size="md"
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
          label="Phòng học"
          name="room_id"
          value={form.room_id}
          onChange={handleChange}
          options={finalRoomOptions}
          placeholder="Chọn phòng"
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
            options={HOUR_OPTIONS}
            placeholder="Chọn giờ"
            error={errors.start_time}
            required
          />
          <Select
            label="Giờ kết thúc"
            name="end_time"
            value={form.end_time}
            onChange={handleChange}
            options={HOUR_OPTIONS}
            placeholder="Chọn giờ"
            error={errors.end_time}
            required
          />
        </div>
      </form>
    </Modal>
  )
}

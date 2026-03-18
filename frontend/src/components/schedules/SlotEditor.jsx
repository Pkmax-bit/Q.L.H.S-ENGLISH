import { useState, useEffect, useContext, useCallback, useMemo } from 'react'
import Modal from '../common/Modal'
import Select from '../common/Select'
import Button from '../common/Button'
import { ToastContext } from '../../context/ToastContext'
import { useFetch } from '../../hooks/useFetch'
import schedulesService from '../../services/schedules.service'
import teachersService from '../../services/teachers.service'
import subjectsService from '../../services/subjects.service'
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
  teacherId: '',
  roomId: '',
  subjectId: '',
  day_of_week: '',
  start_time: '',
  end_time: '',
}

export default function SlotEditor({
  isOpen,
  onClose,
  scheduleId,
  slot,
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
  const isEdit = !!slot

  const fetchTeachers = useCallback(() => teachersService.getAll(), [])
  const fetchSubjects = useCallback(() => subjectsService.getAll(), [])
  const fetchFacilities = useCallback(() => facilitiesService.getAll(), [])

  const { data: teachersData } = useFetch(fetchTeachers)
  const { data: subjectsData } = useFetch(fetchSubjects)
  const { data: facilitiesData } = useFetch(fetchFacilities)

  const teachers = Array.isArray(teachersData) ? teachersData : teachersData?.teachers || []
  const subjects = Array.isArray(subjectsData) ? subjectsData : subjectsData?.subjects || []
  const facilities = Array.isArray(facilitiesData) ? facilitiesData : facilitiesData?.facilities || []

  // Collect rooms from all facilities
  const [rooms, setRooms] = useState([])
  useEffect(() => {
    const loadRooms = async () => {
      const allRooms = []
      for (const f of facilities) {
        try {
          const res = await facilitiesService.getRooms(f._id || f.id)
          const fRooms = res.data?.data || res.data || []
          const roomList = Array.isArray(fRooms) ? fRooms : fRooms.rooms || []
          roomList.forEach((r) => allRooms.push({ ...r, facilityName: f.name }))
        } catch {
          // ignore
        }
      }
      setRooms(allRooms)
    }
    if (facilities.length > 0) loadRooms()
  }, [facilities])

  const teacherOptions = teachers.map((t) => ({ value: t._id || t.id, label: t.name }))
  const subjectOptions = subjects.map((s) => ({ value: s._id || s.id, label: s.name }))
  const roomOptions = rooms.map((r) => ({
    value: r._id || r.id,
    label: `${r.name} (${r.facilityName || ''})`,
  }))

  useEffect(() => {
    if (slot) {
      setForm({
        teacherId: slot.teacherId || slot.teacher?._id || slot.teacher?.id || '',
        roomId: slot.roomId || slot.room?._id || slot.room?.id || '',
        subjectId: slot.subjectId || slot.subject?._id || slot.subject?.id || '',
        day_of_week: String(slot.day_of_week ?? slot.dayOfWeek ?? ''),
        start_time: String(slot.start_time || slot.startTime || ''),
        end_time: String(slot.end_time || slot.endTime || ''),
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
  }, [slot, defaultDay, defaultHour, isOpen])

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
    const slotId = slot?._id || slot?.id

    return existingSlots.filter((s) => {
      if ((s._id || s.id) === slotId) return false
      const sDay = s.day_of_week ?? s.dayOfWeek
      const sStart = Number(s.start_time || s.startTime)
      const sEnd = Number(s.end_time || s.endTime)
      return sDay === day && start < sEnd && end > sStart
    })
  }, [form, existingSlots, slot])

  const validate = () => {
    return validateForm({
      day_of_week: [() => required(form.day_of_week, 'Ngày')],
      start_time: [() => required(form.start_time, 'Giờ bắt đầu')],
      end_time: [() => required(form.end_time, 'Giờ kết thúc')],
      subjectId: [() => required(form.subjectId, 'Môn học')],
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
        start_time: form.start_time,
        end_time: form.end_time,
      }
      if (isEdit) {
        await schedulesService.updateSlot(scheduleId, slot._id || slot.id, payload)
        success('Cập nhật tiết học thành công')
      } else {
        await schedulesService.createSlot(scheduleId, payload)
        success('Thêm tiết học thành công')
      }
      onSuccess()
    } catch (err) {
      showError(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!slot) return
    setDeleteLoading(true)
    try {
      await schedulesService.deleteSlot(scheduleId, slot._id || slot.id)
      success('Xóa tiết học thành công')
      onSuccess()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa tiết học thất bại')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Chỉnh sửa tiết học' : 'Thêm tiết học mới'}
      size="md"
      footer={
        <>
          {isEdit && (
            <Button variant="danger" onClick={handleDelete} loading={deleteLoading} className="mr-auto">
              Xóa tiết
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
                Có {conflicts.length} tiết học trùng thời gian tại khung giờ này.
              </p>
            </div>
          </div>
        )}

        <Select
          label="Môn học"
          name="subjectId"
          value={form.subjectId}
          onChange={handleChange}
          options={subjectOptions}
          placeholder="Chọn môn học"
          error={errors.subjectId}
          required
        />
        <Select
          label="Giáo viên"
          name="teacherId"
          value={form.teacherId}
          onChange={handleChange}
          options={teacherOptions}
          placeholder="Chọn giáo viên"
        />
        <Select
          label="Phòng học"
          name="roomId"
          value={form.roomId}
          onChange={handleChange}
          options={roomOptions}
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

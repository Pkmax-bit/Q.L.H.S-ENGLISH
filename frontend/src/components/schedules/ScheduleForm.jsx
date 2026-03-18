import { useState, useEffect, useContext, useCallback, useMemo } from 'react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Select from '../common/Select'
import Button from '../common/Button'
import { ToastContext } from '../../context/ToastContext'
import { useFetch } from '../../hooks/useFetch'
import schedulesService from '../../services/schedules.service'
import classesService from '../../services/classes.service'
import facilitiesService from '../../services/facilities.service'
import { validateForm, required } from '../../utils/validators'
import { AlertTriangle, Building2, DoorOpen, Repeat, CalendarPlus } from 'lucide-react'

const ALL_DAYS = [
  { value: 1, label: 'Thứ 2', short: 'T2' },
  { value: 2, label: 'Thứ 3', short: 'T3' },
  { value: 3, label: 'Thứ 4', short: 'T4' },
  { value: 4, label: 'Thứ 5', short: 'T5' },
  { value: 5, label: 'Thứ 6', short: 'T6' },
  { value: 6, label: 'Thứ 7', short: 'T7' },
  { value: 0, label: 'Chủ nhật', short: 'CN' },
]

const TIME_OPTIONS = Array.from({ length: 30 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7
  const min = i % 2 === 0 ? '00' : '30'
  const label = `${String(hour).padStart(2, '0')}:${min}`
  return { value: label, label }
})

export default function ScheduleForm({
  isOpen,
  onClose,
  schedule,
  defaultDay,
  defaultHour,
  existingSlots = [],
  onSuccess,
}) {
  const [mode, setMode] = useState('single') // 'single' | 'bulk'
  const [form, setForm] = useState({
    class_id: '',
    facility_id: '',
    room_id: '',
    days_of_week: [],
    day_of_week: '',
    start_time: '',
    end_time: '',
    start_date: '',
    sessions_count: '',
  })
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

  const buildings = facilities.filter((f) => f.type === 'building' || (!f.parent_id && f.type !== 'classroom' && f.type !== 'lab'))
  const allRooms = facilities.filter((f) => f.parent_id || f.type === 'classroom' || f.type === 'lab')
  const filteredRooms = form.facility_id ? allRooms.filter((r) => r.parent_id === form.facility_id) : allRooms

  const buildingOptions = buildings.map((b) => ({ value: b.id, label: `🏢 ${b.name}` }))
  const roomOptions = filteredRooms.map((r) => ({
    value: r.id,
    label: `${r.type === 'lab' ? '🔬' : '🚪'} ${r.name}${r.capacity ? ` (${r.capacity} chỗ)` : ''}`,
  }))
  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }))

  // Get selected class info for date range
  const selectedClass = useMemo(() => classes.find((c) => c.id === form.class_id), [classes, form.class_id])

  useEffect(() => {
    if (schedule) {
      setMode('single')
      const roomId = schedule.room_id || ''
      const room = facilities.find((f) => f.id === roomId)
      setForm({
        class_id: schedule.class_id || '',
        facility_id: room?.parent_id || '',
        room_id: roomId,
        days_of_week: [],
        day_of_week: String(schedule.day_of_week ?? ''),
        start_time: schedule.start_time ? schedule.start_time.substring(0, 5) : '',
        end_time: schedule.end_time ? schedule.end_time.substring(0, 5) : '',
        start_date: '',
        sessions_count: '',
      })
    } else {
      const startHour = defaultHour != null ? `${String(defaultHour).padStart(2, '0')}:00` : ''
      const endHour = defaultHour != null ? `${String(defaultHour + 1).padStart(2, '0')}:00` : ''
      setForm({
        class_id: '',
        facility_id: '',
        room_id: '',
        days_of_week: defaultDay != null ? [defaultDay] : [],
        day_of_week: defaultDay != null ? String(defaultDay) : '',
        start_time: startHour,
        end_time: endHour,
        start_date: '',
        sessions_count: '',
      })
    }
    setErrors({})
  }, [schedule, defaultDay, defaultHour, isOpen, facilities])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      if (name === 'facility_id') next.room_id = ''
      return next
    })
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const toggleDay = (dayValue) => {
    setForm((prev) => {
      const days = [...prev.days_of_week]
      const idx = days.indexOf(dayValue)
      if (idx >= 0) days.splice(idx, 1)
      else days.push(dayValue)
      return { ...prev, days_of_week: days }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (mode === 'bulk') {
      // Bulk validation
      if (!form.class_id) { setErrors({ class_id: 'Chọn lớp học' }); return }
      if (form.days_of_week.length === 0) { showError('Chọn ít nhất 1 ngày trong tuần'); return }
      if (!form.start_time || !form.end_time) { showError('Chọn giờ bắt đầu và kết thúc'); return }
      if (form.end_time <= form.start_time) { setErrors({ end_time: 'Giờ kết thúc phải sau giờ bắt đầu' }); return }

      setLoading(true)
      try {
        const payload = {
          class_id: form.class_id,
          room_id: form.room_id || undefined,
          days_of_week: form.days_of_week,
          start_time: form.start_time,
          end_time: form.end_time,
          start_date: form.start_date || undefined,
          sessions_count: form.sessions_count ? Number(form.sessions_count) : undefined,
        }
        const result = await schedulesService.bulkCreate(payload)
        success(`Đã tạo ${result.data?.created || result.created || form.days_of_week.length} lịch học`)
        onSuccess()
      } catch (err) {
        showError(err.response?.data?.message || 'Có lỗi xảy ra')
      } finally {
        setLoading(false)
      }
      return
    }

    // Single mode
    const errs = validateForm({
      class_id: [() => required(form.class_id, 'Lớp học')],
      day_of_week: [() => required(form.day_of_week, 'Ngày')],
      start_time: [() => required(form.start_time, 'Giờ bắt đầu')],
      end_time: [() => required(form.end_time, 'Giờ kết thúc')],
    })
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    if (form.end_time <= form.start_time) { setErrors({ end_time: 'Giờ kết thúc phải sau giờ bắt đầu' }); return }

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

  const DAY_OPTIONS_SINGLE = ALL_DAYS.map((d) => ({ value: String(d.value), label: d.label }))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Chỉnh sửa lịch học' : mode === 'bulk' ? 'Tạo lịch học lặp lại' : 'Thêm lịch học mới'}
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
          <Button onClick={handleSubmit} loading={loading} icon={mode === 'bulk' ? Repeat : CalendarPlus}>
            {isEdit ? 'Cập nhật' : mode === 'bulk' ? `Tạo lịch (${form.days_of_week.length} ngày)` : 'Thêm mới'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mode toggle */}
        {!isEdit && (
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                mode === 'single' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CalendarPlus className="h-4 w-4" /> Thêm đơn
            </button>
            <button
              type="button"
              onClick={() => setMode('bulk')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                mode === 'bulk' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Repeat className="h-4 w-4" /> Lặp lại hàng tuần
            </button>
          </div>
        )}

        {/* Class selection */}
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

        {/* Show class date range */}
        {selectedClass && (selectedClass.start_date || selectedClass.end_date) && (
          <div className="text-xs text-gray-500 bg-blue-50 rounded-lg px-3 py-2 -mt-2">
            📅 Thời gian lớp: {selectedClass.start_date || '?'} → {selectedClass.end_date || '?'}
          </div>
        )}

        {/* Day selection */}
        {mode === 'single' ? (
          <Select
            label="Ngày trong tuần"
            name="day_of_week"
            value={form.day_of_week}
            onChange={handleChange}
            options={DAY_OPTIONS_SINGLE}
            placeholder="Chọn ngày"
            error={errors.day_of_week}
            required
          />
        ) : (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Chọn các ngày học trong tuần <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((day) => {
                const selected = form.days_of_week.includes(day.value)
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                      selected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    {day.short}
                  </button>
                )
              })}
            </div>
            {form.days_of_week.length > 0 && (
              <p className="text-xs text-blue-600 mt-1">
                ✅ Đã chọn: {form.days_of_week.map((d) => ALL_DAYS.find((a) => a.value === d)?.short).join(', ')}
              </p>
            )}
          </div>
        )}

        {/* Time */}
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

        {/* Bulk: start date + sessions count */}
        {mode === 'bulk' && (
          <div className="border border-purple-200 rounded-lg p-4 space-y-3 bg-purple-50/50">
            <p className="text-sm font-medium text-purple-700 flex items-center gap-2">
              <Repeat className="h-4 w-4" /> Thông tin lặp lại
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Ngày bắt đầu"
                name="start_date"
                type="date"
                value={form.start_date}
                onChange={handleChange}
                placeholder="dd/mm/yyyy"
              />
              <Input
                label="Số buổi học"
                name="sessions_count"
                type="number"
                value={form.sessions_count}
                onChange={handleChange}
                placeholder="VD: 24"
              />
            </div>
            {form.days_of_week.length > 0 && form.sessions_count && (
              <p className="text-xs text-purple-600">
                📊 {form.days_of_week.length} buổi/tuần × {Math.ceil(Number(form.sessions_count) / form.days_of_week.length)} tuần
                = khoảng {Math.ceil(Number(form.sessions_count) / form.days_of_week.length)} tuần học
              </p>
            )}
          </div>
        )}

        {/* Location */}
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
                placeholder="Chọn cơ sở..."
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
        </div>
      </form>
    </Modal>
  )
}

import { useState, useContext, useCallback, useMemo } from 'react'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import ConfirmDialog from '../common/ConfirmDialog'
import ScheduleForm from './ScheduleForm'
import SlotEditor from './SlotEditor'
import { useFetch } from '../../hooks/useFetch'
import { ToastContext } from '../../context/ToastContext'
import schedulesService from '../../services/schedules.service'

const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
const DAY_KEYS = [1, 2, 3, 4, 5, 6, 0]
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7:00 to 20:00

const SLOT_COLORS = [
  'bg-blue-100 border-blue-300 text-blue-700',
  'bg-green-100 border-green-300 text-green-700',
  'bg-purple-100 border-purple-300 text-purple-700',
  'bg-amber-100 border-amber-300 text-amber-700',
  'bg-red-100 border-red-300 text-red-700',
  'bg-teal-100 border-teal-300 text-teal-700',
  'bg-pink-100 border-pink-300 text-pink-700',
]

export default function ScheduleView() {
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [showSlotEditor, setShowSlotEditor] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedHour, setSelectedHour] = useState(null)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { success, error: showError } = useContext(ToastContext)

  const fetchSchedules = useCallback(() => schedulesService.getAll(), [])
  const { data: schedulesData, loading, execute: reloadSchedules } = useFetch(fetchSchedules)
  const schedules = Array.isArray(schedulesData) ? schedulesData : schedulesData?.schedules || []

  // Select first schedule by default
  const activeSchedule = selectedSchedule || schedules[0]
  const scheduleId = activeSchedule?._id || activeSchedule?.id

  const fetchSlots = useCallback(() => {
    if (scheduleId) return schedulesService.getSlots(scheduleId)
    return Promise.resolve({ data: [] })
  }, [scheduleId])
  const { data: slotsData, loading: slotsLoading, execute: reloadSlots } = useFetch(
    fetchSlots, [scheduleId], !!scheduleId
  )
  const slots = Array.isArray(slotsData) ? slotsData : slotsData?.slots || []

  // Color map for subjects
  const colorMap = useMemo(() => {
    const map = {}
    let idx = 0
    slots.forEach((slot) => {
      const subjectKey = slot.subject?._id || slot.subjectId || slot.subject?.name || 'unknown'
      if (!(subjectKey in map)) {
        map[subjectKey] = SLOT_COLORS[idx % SLOT_COLORS.length]
        idx++
      }
    })
    return map
  }, [slots])

  const getSlotForCell = (dayKey, hour) => {
    return slots.filter((slot) => {
      const slotDay = slot.day_of_week ?? slot.dayOfWeek
      const startH = parseInt(slot.start_time || slot.startTime || '0')
      const endH = parseInt(slot.end_time || slot.endTime || '0')
      return slotDay === dayKey && startH <= hour && endH > hour
    })
  }

  const getSlotStartsAt = (dayKey, hour) => {
    return slots.find((slot) => {
      const slotDay = slot.day_of_week ?? slot.dayOfWeek
      const startH = parseInt(slot.start_time || slot.startTime || '0')
      return slotDay === dayKey && startH === hour
    })
  }

  const handleCellClick = (dayKey, hour) => {
    const existingSlot = getSlotStartsAt(dayKey, hour)
    if (existingSlot) {
      setSelectedSlot(existingSlot)
    } else {
      setSelectedSlot(null)
      setSelectedDay(dayKey)
      setSelectedHour(hour)
    }
    setShowSlotEditor(true)
  }

  const handleDeleteSchedule = async () => {
    if (!activeSchedule) return
    setDeleting(true)
    try {
      await schedulesService.delete(scheduleId)
      success('Xóa thời khóa biểu thành công')
      setSelectedSchedule(null)
      reloadSchedules()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa thất bại')
    } finally {
      setDeleting(false)
      setShowDelete(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thời khóa biểu</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý lịch học hàng tuần</p>
        </div>
        <Button icon={Plus} onClick={() => setShowScheduleForm(true)}>
          Thêm TKB
        </Button>
      </div>

      {/* Schedule selector */}
      {schedules.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {schedules.map((sch) => (
            <button
              key={sch._id || sch.id}
              onClick={() => setSelectedSchedule(sch)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                (sch._id || sch.id) === scheduleId
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {sch.name || sch.class?.name || 'TKB'}
            </button>
          ))}
        </div>
      )}

      {loading || slotsLoading ? (
        <LoadingSpinner />
      ) : !activeSchedule ? (
        <div className="text-center py-12 text-gray-400">
          <p>Chưa có thời khóa biểu. Nhấn &quot;Thêm TKB&quot; để bắt đầu.</p>
        </div>
      ) : (
        <>
          {/* Active schedule info */}
          <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-lg border border-gray-200">
            <div>
              <p className="font-medium text-gray-900">{activeSchedule.name || 'Thời khóa biểu'}</p>
              <p className="text-xs text-gray-500">
                {activeSchedule.class?.name || ''} 
                {activeSchedule.start_date || activeSchedule.startDate ? ` • Từ ${activeSchedule.start_date || activeSchedule.startDate}` : ''}
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDelete(true)}
            >
              Xóa TKB
            </Button>
          </div>

          {/* Weekly grid */}
          <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="border border-gray-200 px-3 py-2 bg-gray-50 text-gray-600 w-20">Giờ</th>
                  {DAYS.map((day, i) => (
                    <th key={i} className="border border-gray-200 px-3 py-2 bg-gray-50 text-gray-600 min-w-[120px]">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour) => (
                  <tr key={hour}>
                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-500 font-medium bg-gray-50">
                      {String(hour).padStart(2, '0')}:00
                    </td>
                    {DAY_KEYS.map((dayKey, dayIdx) => {
                      const startSlot = getSlotStartsAt(dayKey, hour)
                      const cellSlots = getSlotForCell(dayKey, hour)
                      const isCovered = cellSlots.length > 0 && !startSlot

                      if (isCovered) return null // Covered by rowspan

                      if (startSlot) {
                        const startH = parseInt(startSlot.start_time || startSlot.startTime || '0')
                        const endH = parseInt(startSlot.end_time || startSlot.endTime || '0')
                        const span = Math.max(1, endH - startH)
                        const subjectKey = startSlot.subject?._id || startSlot.subjectId || 'unknown'
                        const color = colorMap[subjectKey] || SLOT_COLORS[0]

                        return (
                          <td
                            key={dayIdx}
                            rowSpan={span}
                            className="border border-gray-200 p-1 cursor-pointer"
                            onClick={() => handleCellClick(dayKey, hour)}
                          >
                            <div className={`rounded-lg p-2 h-full border ${color}`}>
                              <p className="font-medium text-xs leading-tight">
                                {startSlot.subject?.name || startSlot.subjectName || '—'}
                              </p>
                              <p className="text-xs opacity-70 mt-0.5">
                                {startSlot.teacher?.name || startSlot.teacherName || ''}
                              </p>
                              <p className="text-xs opacity-70">
                                {startSlot.room?.name || startSlot.roomName || ''}
                              </p>
                            </div>
                          </td>
                        )
                      }

                      return (
                        <td
                          key={dayIdx}
                          className="border border-gray-200 p-1 cursor-pointer hover:bg-blue-50 transition-colors"
                          onClick={() => handleCellClick(dayKey, hour)}
                        />
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ScheduleForm
        isOpen={showScheduleForm}
        onClose={() => setShowScheduleForm(false)}
        onSuccess={() => { setShowScheduleForm(false); reloadSchedules() }}
      />

      <SlotEditor
        isOpen={showSlotEditor}
        onClose={() => { setShowSlotEditor(false); setSelectedSlot(null) }}
        scheduleId={scheduleId}
        slot={selectedSlot}
        defaultDay={selectedDay}
        defaultHour={selectedHour}
        existingSlots={slots}
        onSuccess={() => { setShowSlotEditor(false); setSelectedSlot(null); reloadSlots() }}
      />

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDeleteSchedule}
        loading={deleting}
        title="Xóa thời khóa biểu"
        message={`Bạn có chắc chắn muốn xóa thời khóa biểu "${activeSchedule?.name}"?`}
      />
    </div>
  )
}

import { useState, useContext, useCallback, useMemo } from 'react'
import { Plus } from 'lucide-react'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import ConfirmDialog from '../common/ConfirmDialog'
import ScheduleForm from './ScheduleForm'
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
  const [showForm, setShowForm] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedHour, setSelectedHour] = useState(null)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { success, error: showError } = useContext(ToastContext)

  const fetchSchedules = useCallback(() => schedulesService.getAll(), [])
  const { data: schedulesData, loading, execute: reload } = useFetch(fetchSchedules)
  const schedules = Array.isArray(schedulesData) ? schedulesData : schedulesData?.schedules || []

  // Color map for classes
  const colorMap = useMemo(() => {
    const map = {}
    let idx = 0
    schedules.forEach((slot) => {
      const classKey = slot.class_id || slot.class?.id || 'unknown'
      if (!(classKey in map)) {
        map[classKey] = SLOT_COLORS[idx % SLOT_COLORS.length]
        idx++
      }
    })
    return map
  }, [schedules])

  const getSlotStartsAt = (dayKey, hour) => {
    return schedules.find((slot) => {
      const slotDay = slot.day_of_week
      const startH = parseInt(slot.start_time || '0')
      return slotDay === dayKey && startH === hour
    })
  }

  const getSlotForCell = (dayKey, hour) => {
    return schedules.filter((slot) => {
      const slotDay = slot.day_of_week
      const startH = parseInt(slot.start_time || '0')
      const endH = parseInt(slot.end_time || '0')
      return slotDay === dayKey && startH <= hour && endH > hour
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
    setShowForm(true)
  }

  const handleDeleteSlot = async () => {
    if (!selectedSlot) return
    setDeleting(true)
    try {
      await schedulesService.delete(selectedSlot.id)
      success('Xóa lịch học thành công')
      reload()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa thất bại')
    } finally {
      setDeleting(false)
      setShowDelete(false)
      setSelectedSlot(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thời khóa biểu</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý lịch học hàng tuần</p>
        </div>
        <Button icon={Plus} onClick={() => { setSelectedSlot(null); setSelectedDay(null); setSelectedHour(null); setShowForm(true) }}>
          Thêm lịch học
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : schedules.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>Chưa có lịch học nào. Nhấn &quot;Thêm lịch học&quot; để bắt đầu.</p>
        </div>
      ) : (
        /* Weekly grid */
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
                      const startH = parseInt(startSlot.start_time || '0')
                      const endH = parseInt(startSlot.end_time || '0')
                      const span = Math.max(1, endH - startH)
                      const classKey = startSlot.class_id || startSlot.class?.id || 'unknown'
                      const color = colorMap[classKey] || SLOT_COLORS[0]

                      return (
                        <td
                          key={dayIdx}
                          rowSpan={span}
                          className="border border-gray-200 p-1 cursor-pointer"
                          onClick={() => handleCellClick(dayKey, hour)}
                        >
                          <div className={`rounded-lg p-2 h-full border ${color}`}>
                            <p className="font-medium text-xs leading-tight">
                              {startSlot.class?.name || '—'}
                            </p>
                            <p className="text-xs opacity-70 mt-0.5">
                              {startSlot.room?.name || startSlot.facility?.name || ''}
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
      )}

      <ScheduleForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setSelectedSlot(null) }}
        schedule={selectedSlot}
        defaultDay={selectedDay}
        defaultHour={selectedHour}
        existingSlots={schedules}
        onSuccess={() => { setShowForm(false); setSelectedSlot(null); reload() }}
      />

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDeleteSlot}
        loading={deleting}
        title="Xóa lịch học"
        message="Bạn có chắc chắn muốn xóa lịch học này?"
      />
    </div>
  )
}

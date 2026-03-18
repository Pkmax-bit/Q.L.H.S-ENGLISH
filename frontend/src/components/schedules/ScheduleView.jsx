import { useState, useContext, useCallback, useMemo } from 'react'
import { Plus, ChevronLeft, ChevronRight, Calendar, LayoutGrid, List } from 'lucide-react'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import ConfirmDialog from '../common/ConfirmDialog'
import ScheduleForm from './ScheduleForm'
import { useFetch } from '../../hooks/useFetch'
import { ToastContext } from '../../context/ToastContext'
import schedulesService from '../../services/schedules.service'

const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN']
const DAY_KEYS = [1, 2, 3, 4, 5, 6, 0]
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7) // 7-21

const SLOT_COLORS = [
  { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700', dot: 'bg-blue-500' },
  { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700', dot: 'bg-green-500' },
  { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-700', dot: 'bg-purple-500' },
  { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700', dot: 'bg-amber-500' },
  { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700', dot: 'bg-red-500' },
  { bg: 'bg-teal-100', border: 'border-teal-300', text: 'text-teal-700', dot: 'bg-teal-500' },
  { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-700', dot: 'bg-pink-500' },
  { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-700', dot: 'bg-indigo-500' },
]

function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(date.setDate(diff))
}

function formatDateShort(d) {
  return `${d.getDate()}/${d.getMonth() + 1}`
}

function getWeekDates(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function getMonthWeeks(year, month) {
  const firstDay = new Date(year, month, 1)
  const monday = getMonday(firstDay)
  if (monday.getDate() > 1 && monday.getMonth() === month) {
    monday.setDate(monday.getDate() - 7)
  }
  const weeks = []
  const current = new Date(monday)
  while (weeks.length < 6) {
    const weekStart = new Date(current)
    weeks.push(weekStart)
    current.setDate(current.getDate() + 7)
    if (current.getMonth() > month && current.getDate() > 7 && weeks.length >= 4) break
  }
  return weeks
}

function parseTimeHour(timeStr) {
  if (!timeStr) return 0
  const parts = String(timeStr).split(':')
  return parseInt(parts[0]) || 0
}

function parseTimeMinutes(timeStr) {
  if (!timeStr) return 0
  const parts = String(timeStr).split(':')
  return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0)
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  return String(timeStr).substring(0, 5)
}

export default function ScheduleView() {
  const [viewMode, setViewMode] = useState('week') // 'week' | 'month' | 'list'
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedHour, setSelectedHour] = useState(null)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { success, error: showError } = useContext(ToastContext)

  const fetchSchedules = useCallback(() => schedulesService.getAll({ limit: 200 }), [])
  const { data: schedulesData, loading, execute: reload } = useFetch(fetchSchedules)
  const schedules = Array.isArray(schedulesData) ? schedulesData : schedulesData?.schedules || []

  const colorMap = useMemo(() => {
    const map = {}
    let idx = 0
    schedules.forEach((slot) => {
      const key = slot.class_id || 'unknown'
      if (!(key in map)) { map[key] = SLOT_COLORS[idx % SLOT_COLORS.length]; idx++ }
    })
    return map
  }, [schedules])

  const monday = useMemo(() => getMonday(currentDate), [currentDate])
  const weekDates = useMemo(() => getWeekDates(monday), [monday])

  const navigateWeek = (dir) => {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + dir * 7)
      return d
    })
  }

  const navigateMonth = (dir) => {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + dir)
      return d
    })
  }

  const goToday = () => setCurrentDate(new Date())

  const handleCellClick = (dayKey, hour) => {
    const existing = schedules.find((s) => s.day_of_week === dayKey && parseTimeHour(s.start_time) === hour)
    if (existing) { setSelectedSlot(existing) } else { setSelectedSlot(null); setSelectedDay(dayKey); setSelectedHour(hour) }
    setShowForm(true)
  }

  const handleSlotClick = (slot) => {
    setSelectedSlot(slot)
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
    } finally { setDeleting(false); setShowDelete(false); setSelectedSlot(null) }
  }

  // Header with navigation
  const weekLabel = `${formatDateShort(weekDates[0])} — ${formatDateShort(weekDates[6])}`
  const monthLabel = currentDate.toLocaleString('vi-VN', { month: 'long', year: 'numeric' })

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thời khóa biểu</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý lịch học hàng tuần</p>
        </div>
        <Button icon={Plus} onClick={() => { setSelectedSlot(null); setSelectedDay(null); setSelectedHour(null); setShowForm(true) }}>
          Thêm lịch học
        </Button>
      </div>

      {/* Toolbar: view mode + navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm">
        {/* View mode tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {[
            { key: 'week', label: 'Tuần', icon: Calendar },
            { key: 'month', label: 'Tháng', icon: LayoutGrid },
            { key: 'list', label: 'Danh sách', icon: List },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button onClick={() => (viewMode === 'month' ? navigateMonth(-1) : navigateWeek(-1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={goToday} className="px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg">
            Hôm nay
          </button>
          <button onClick={() => (viewMode === 'month' ? navigateMonth(1) : navigateWeek(1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronRight className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-gray-700 ml-2">
            {viewMode === 'month' ? monthLabel : weekLabel}
          </span>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : schedules.length === 0 && viewMode !== 'week' ? (
        <div className="text-center py-12 text-gray-400">
          <p>Chưa có lịch học nào.</p>
        </div>
      ) : viewMode === 'week' ? (
        <WeekView
          schedules={schedules}
          weekDates={weekDates}
          colorMap={colorMap}
          onCellClick={handleCellClick}
          onSlotClick={handleSlotClick}
        />
      ) : viewMode === 'month' ? (
        <MonthView
          schedules={schedules}
          currentDate={currentDate}
          colorMap={colorMap}
          onSlotClick={handleSlotClick}
        />
      ) : (
        <ListView schedules={schedules} colorMap={colorMap} onSlotClick={handleSlotClick} />
      )}

      {/* Legend */}
      {schedules.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {Object.entries(colorMap).map(([classId, color]) => {
            const slot = schedules.find((s) => s.class_id === classId || s.class?.id === classId)
            return (
              <div key={classId} className="flex items-center gap-1.5 text-xs text-gray-600">
                <div className={`w-3 h-3 rounded-full ${color.dot}`} />
                <span>{slot?.class_name || slot?.class?.name || 'Lớp học'}</span>
              </div>
            )
          })}
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

      <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDeleteSlot} loading={deleting} title="Xóa lịch học" message="Bạn có chắc chắn muốn xóa?" />
    </div>
  )
}

/* ========== WEEK VIEW ========== */
function WeekView({ schedules, weekDates, colorMap, onCellClick, onSlotClick }) {
  const getSlotAt = (dayKey, hour) => {
    return schedules.filter((s) => {
      return s.day_of_week === dayKey && parseTimeHour(s.start_time) <= hour && parseTimeHour(s.end_time) > hour
    })
  }

  const getSlotStartsAt = (dayKey, hour) => {
    return schedules.find((s) => s.day_of_week === dayKey && parseTimeHour(s.start_time) === hour)
  }

  const today = new Date()
  const todayDay = today.getDay() === 0 ? 0 : today.getDay()

  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-sm border-collapse min-w-[700px]">
        <thead>
          <tr>
            <th className="border border-gray-200 px-2 py-2.5 bg-gray-50 text-gray-500 w-16 text-xs">Giờ</th>
            {DAY_KEYS.map((dayKey, i) => {
              const isToday = dayKey === todayDay
              return (
                <th key={i} className={`border border-gray-200 px-2 py-2.5 text-xs min-w-[100px] ${isToday ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'}`}>
                  <div>{DAYS[i]}</div>
                  <div className={`text-xs font-normal mt-0.5 ${isToday ? 'text-blue-500' : 'text-gray-400'}`}>
                    {formatDateShort(weekDates[i])}
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {HOURS.map((hour) => (
            <tr key={hour}>
              <td className="border border-gray-200 px-2 py-1.5 text-center text-gray-400 font-medium bg-gray-50 text-xs">
                {String(hour).padStart(2, '0')}:00
              </td>
              {DAY_KEYS.map((dayKey, dayIdx) => {
                const startSlot = getSlotStartsAt(dayKey, hour)
                const cellSlots = getSlotAt(dayKey, hour)
                const isCovered = cellSlots.length > 0 && !startSlot

                if (isCovered) return null

                if (startSlot) {
                  const startH = parseTimeHour(startSlot.start_time)
                  const endH = parseTimeHour(startSlot.end_time)
                  const span = Math.max(1, endH - startH)
                  const color = colorMap[startSlot.class_id] || SLOT_COLORS[0]

                  return (
                    <td key={dayIdx} rowSpan={span} className="border border-gray-200 p-0.5 cursor-pointer" onClick={() => onSlotClick(startSlot)}>
                      <div className={`rounded-lg p-2 h-full border ${color.bg} ${color.border} ${color.text}`}>
                        <p className="font-semibold text-xs leading-tight">{startSlot.class_name || startSlot.class?.name || '—'}</p>
                        <p className="text-xs opacity-70 mt-0.5">{formatTime(startSlot.start_time)} - {formatTime(startSlot.end_time)}</p>
                        {(startSlot.room_name || startSlot.facility?.name) && (
                          <p className="text-xs opacity-60 mt-0.5">📍 {startSlot.room_name || startSlot.facility?.name}</p>
                        )}
                      </div>
                    </td>
                  )
                }

                return (
                  <td key={dayIdx} className="border border-gray-200 p-0.5 cursor-pointer hover:bg-blue-50/50 transition-colors" onClick={() => onCellClick(dayKey, hour)} />
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ========== MONTH VIEW ========== */
function MonthView({ schedules, currentDate, colorMap, onSlotClick }) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const weeks = getMonthWeeks(year, month)
  const today = new Date()

  const getSlotsForDay = (dayKey) => {
    return schedules.filter((s) => s.day_of_week === dayKey).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAYS.map((day, i) => (
          <div key={i} className="px-2 py-2 text-center text-xs font-semibold text-gray-500 bg-gray-50 border-r border-gray-200 last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Week rows */}
      {weeks.map((weekStart, wIdx) => {
        const dates = getWeekDates(weekStart)
        return (
          <div key={wIdx} className="grid grid-cols-7 border-b border-gray-200 last:border-b-0">
            {dates.map((date, dIdx) => {
              const isCurrentMonth = date.getMonth() === month
              const isToday = date.toDateString() === today.toDateString()
              const dayKey = DAY_KEYS[dIdx]
              const daySlots = getSlotsForDay(dayKey)

              return (
                <div
                  key={dIdx}
                  className={`min-h-[90px] p-1.5 border-r border-gray-200 last:border-r-0 ${
                    !isCurrentMonth ? 'bg-gray-50/50' : ''
                  }`}
                >
                  <div className={`text-xs font-medium mb-1 ${
                    isToday
                      ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                      : isCurrentMonth
                        ? 'text-gray-700'
                        : 'text-gray-300'
                  }`}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {daySlots.slice(0, 3).map((slot) => {
                      const color = colorMap[slot.class_id] || SLOT_COLORS[0]
                      return (
                        <div
                          key={slot.id}
                          onClick={() => onSlotClick(slot)}
                          className={`text-xs px-1.5 py-0.5 rounded cursor-pointer truncate ${color.bg} ${color.text} hover:opacity-80`}
                          title={`${slot.class_name || ''} ${formatTime(slot.start_time)}-${formatTime(slot.end_time)}`}
                        >
                          <span className="font-medium">{formatTime(slot.start_time)}</span>{' '}
                          <span className="opacity-75">{slot.class_name || slot.class?.name || ''}</span>
                        </div>
                      )
                    })}
                    {daySlots.length > 3 && (
                      <p className="text-xs text-gray-400 px-1">+{daySlots.length - 3} khác</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

/* ========== LIST VIEW ========== */
function ListView({ schedules, colorMap, onSlotClick }) {
  const sorted = [...schedules].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week
    return (a.start_time || '').localeCompare(b.start_time || '')
  })

  const dayNames = { 0: 'Chủ nhật', 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7' }
  const grouped = {}
  sorted.forEach((s) => {
    const key = s.day_of_week
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(s)
  })

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([dayKey, slots]) => (
        <div key={dayKey} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">{dayNames[dayKey] || `Ngày ${dayKey}`}</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {slots.map((slot) => {
              const color = colorMap[slot.class_id] || SLOT_COLORS[0]
              return (
                <div
                  key={slot.id}
                  onClick={() => onSlotClick(slot)}
                  className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-1.5 h-10 rounded-full ${color.dot}`} />
                  <div className="text-sm font-mono text-gray-500 w-28">
                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{slot.class_name || slot.class?.name || '—'}</p>
                    {(slot.room_name || slot.facility?.name) && (
                      <p className="text-xs text-gray-400">📍 {slot.room_name || slot.facility?.name}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

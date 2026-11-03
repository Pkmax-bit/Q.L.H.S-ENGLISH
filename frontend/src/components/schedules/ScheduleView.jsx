import { useState, useContext, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, ChevronLeft, ChevronRight, Calendar, LayoutGrid, List, Columns3, MapPin, Clock, User, Filter } from 'lucide-react'
import Button from '../common/Button'
import PageTourButton from '../tour/PageTourButton'
import LoadingSpinner from '../common/LoadingSpinner'
import ConfirmDialog from '../common/ConfirmDialog'
import ScheduleForm from './ScheduleForm'
import { useFetch } from '../../hooks/useFetch'
import { useAuth } from '../../hooks/useAuth'
import { ToastContext } from '../../context/ToastContext'
import schedulesService from '../../services/schedules.service'
import ScheduleKanbanBoard from './ScheduleKanbanBoard'
import ScheduleFilterBar from './ScheduleFilterBar'
import {
  loadSchedulePrefs,
  saveSchedulePrefs,
  loadScheduleHistory,
  appendScheduleHistory,
  clearScheduleHistory,
  matchesTimeFilter,
  markScheduleHistoryUndone,
} from '../../utils/schedulePreferences'

const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN']
const DAY_KEYS = [1, 2, 3, 4, 5, 6, 0]
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7) // 7-21

const SLOT_COLORS = [
  { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800', dot: 'bg-amber-500' },
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

function formatDateFull(d) {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
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

function formatTime(timeStr) {
  if (!timeStr) return ''
  return String(timeStr).substring(0, 5)
}

function formatDuration(start, end) {
  if (!start || !end) return ''
  const [sh, sm = 0] = String(start).split(':').map(Number)
  const [eh, em = 0] = String(end).split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins <= 0) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h && m) return `${h}h${String(m).padStart(2, '0')}`
  if (h) return `${h} giờ`
  return `${m} phút`
}

function formatDateRange(slot) {
  const start = slot.start_date || slot.class_start_date
  const end = slot.end_date || slot.class_end_date
  if (!start && !end) return null
  const fmt = (s) => {
    const [y, m, d] = String(s).slice(0, 10).split('-')
    return `${d}/${m}/${y}`
  }
  if (start && end) return `${fmt(start)} → ${fmt(end)}`
  if (start) return `Từ ${fmt(start)}`
  return `Đến ${fmt(end)}`
}

function ScheduleSlotCard({ slot, color, interactive, onClick, compact = false }) {
  const dateRange = formatDateRange(slot)
  const duration = formatDuration(slot.start_time, slot.end_time)
  return (
    <button
      type="button"
      onClick={() => onClick?.(slot)}
      disabled={!interactive}
      className={`w-full text-left rounded-xl border p-3 transition-all ${color.bg} ${color.border} ${interactive ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : 'cursor-default'} ${compact ? 'p-2' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-bold leading-tight ${color.text}`}>
          {slot.class_name || slot.class?.name || '—'}
        </p>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {(slot.subject_name || slot.subject_code) && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/70 ${color.text} opacity-90`}>
              {slot.subject_code || slot.subject_name}
            </span>
          )}
          {duration && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/60 ${color.text}`}>
              {duration}
            </span>
          )}
        </div>
      </div>
      <p className={`flex items-center gap-1 text-xs mt-1.5 ${color.text} opacity-80`}>
        <Clock className="h-3 w-3 shrink-0" />
        {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
      </p>
      {slot.teacher_name && (
        <p className={`flex items-center gap-1 text-xs mt-1 ${color.text} opacity-75`}>
          <User className="h-3 w-3 shrink-0" />
          {slot.teacher_name}
        </p>
      )}
      {(slot.room_name || slot.facility?.name) && (
        <p className={`flex items-center gap-1 text-xs mt-1 ${color.text} opacity-70`}>
          <MapPin className="h-3 w-3 shrink-0" />
          {slot.room_name || slot.facility?.name}
        </p>
      )}
      {dateRange && !compact && (
        <p className="text-[10px] mt-1.5 text-slate-500 truncate" title={dateRange}>{dateRange}</p>
      )}
    </button>
  )
}

/**
 * Check if a schedule slot is active on a given date.
 * Slot is active when:
 * 1. day-of-week matches
 * 2. date is within slot.start_date / slot.end_date (if present)
 * 3. date is within the owning class's start_date / end_date (if present)
 *    → giải quyết trường hợp slot không gắn end_date riêng nhưng lớp đã kết thúc.
 */
function isSlotActiveOnDate(slot, date) {
  if (slot.day_of_week !== date.getDay()) return false

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

  const slotStart = slot.start_date ? String(slot.start_date).slice(0, 10) : null
  const slotEnd = slot.end_date ? String(slot.end_date).slice(0, 10) : null
  const classStart = slot.class_start_date ? String(slot.class_start_date).slice(0, 10) : null
  const classEnd = slot.class_end_date ? String(slot.class_end_date).slice(0, 10) : null

  if (slotStart && dateStr < slotStart) return false
  if (slotEnd && dateStr > slotEnd) return false
  if (classStart && dateStr < classStart) return false
  if (classEnd && dateStr > classEnd) return false

  return true
}

export default function ScheduleView() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const classIdFromUrl = searchParams.get('class_id')
  const isAdmin = user?.role === 'admin'
  const canEdit = isAdmin

  const [viewMode, setViewMode] = useState('kanban')
  const [classFilter, setClassFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [showHistory, setShowHistory] = useState(false)
  const [moveHistory, setMoveHistory] = useState([])
  const [prefsLoaded, setPrefsLoaded] = useState(false)
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

  useEffect(() => {
    if (!user?.id) return
    const prefs = loadSchedulePrefs(user.id)
    if (prefs) {
      setViewMode(prefs.viewMode)
      setClassFilter(prefs.classFilter)
      setSubjectFilter(prefs.subjectFilter)
      setTimeFilter(prefs.timeFilter)
      setShowHistory(prefs.showHistory)
    }
    setMoveHistory(loadScheduleHistory(user.id))
    setPrefsLoaded(true)
  }, [user?.id])

  useEffect(() => {
    if (classIdFromUrl) setClassFilter(classIdFromUrl)
  }, [classIdFromUrl])

  useEffect(() => {
    if (!user?.id || !prefsLoaded) return
    saveSchedulePrefs(user.id, {
      viewMode,
      classFilter,
      subjectFilter,
      timeFilter,
      showHistory,
    })
  }, [user?.id, prefsLoaded, viewMode, classFilter, subjectFilter, timeFilter, showHistory])

  const colorMap = useMemo(() => {
    const map = {}
    let idx = 0
    schedules.forEach((slot) => {
      const key = slot.class_id || 'unknown'
      if (!(key in map)) { map[key] = SLOT_COLORS[idx % SLOT_COLORS.length]; idx++ }
    })
    return map
  }, [schedules])

  const classOptions = useMemo(() => {
    const seen = new Map()
    schedules.forEach((s) => {
      if (s.class_id && !seen.has(s.class_id)) {
        seen.set(s.class_id, s.class_name || s.class?.name || 'Lớp học')
      }
    })
    return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [schedules])

  const subjectOptions = useMemo(() => {
    const seen = new Map()
    schedules.forEach((s) => {
      if (s.subject_id && !seen.has(s.subject_id)) {
        seen.set(s.subject_id, {
          id: s.subject_id,
          name: s.subject_name || 'Môn học',
          code: s.subject_code || null,
        })
      }
    })
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [schedules])

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (classFilter !== 'all' && String(s.class_id) !== String(classFilter)) return false
      if (subjectFilter !== 'all' && String(s.subject_id) !== String(subjectFilter)) return false
      if (!matchesTimeFilter(s, timeFilter)) return false
      return true
    })
  }, [schedules, classFilter, subjectFilter, timeFilter])

  const hasActiveFilters = classFilter !== 'all' || subjectFilter !== 'all' || timeFilter !== 'all'

  const resetFilters = () => {
    setClassFilter('all')
    setSubjectFilter('all')
    setTimeFilter('all')
  }

  const todaySlots = useMemo(() => {
    const today = new Date()
    return filteredSchedules
      .filter((s) => isSlotActiveOnDate(s, today))
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
  }, [filteredSchedules])

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

  const handleCellClick = (dayKey, hour, date) => {
    if (!canEdit) return
    // Find existing slot at this specific date + hour
    const existing = schedules.find((s) =>
      isSlotActiveOnDate(s, date) && parseTimeHour(s.start_time) === hour
    )
    if (existing) { setSelectedSlot(existing) } else { setSelectedSlot(null); setSelectedDay(dayKey); setSelectedHour(hour) }
    setShowForm(true)
  }

  const handleSlotClick = (slot) => {
    if (!canEdit) return
    setSelectedSlot(slot)
    setShowForm(true)
  }

  const handleMoveSlot = useCallback(async (slotId, newDayOfWeek, meta = {}) => {
    const slot = schedules.find((s) => s.id === slotId)
    const fromDay = meta.fromDay ?? slot?.day_of_week
    try {
      await schedulesService.update(slotId, { day_of_week: newDayOfWeek })
      const dayLabel = DAYS[DAY_KEYS.indexOf(newDayOfWeek)]
      success(`Đã chuyển ca sang ${dayLabel}`)
      if (!meta.skipHistory && user?.id) {
        const next = appendScheduleHistory(user.id, {
          type: 'move',
          slotId,
          className: slot?.class_name || slot?.class?.name,
          fromDay,
          toDay: newDayOfWeek,
          startTime: slot?.start_time,
        })
        setMoveHistory(next)
      }
      reload()
    } catch (err) {
      showError(err.response?.data?.message || 'Không thể chuyển ca — có thể trùng lịch phòng/GV')
      throw err
    }
  }, [schedules, success, showError, reload, user?.id])

  const handleUndoMove = useCallback(async (item) => {
    if (!canEdit || item.undone || item.type !== 'move') return
    try {
      await handleMoveSlot(item.slotId, item.fromDay, { skipHistory: true, fromDay: item.toDay })
      if (user?.id) {
        setMoveHistory(markScheduleHistoryUndone(user.id, item.id))
      }
      success('Đã hoàn tác thay đổi')
    } catch {
      /* handleMoveSlot already shows error */
    }
  }, [canEdit, handleMoveSlot, user?.id, success])

  const handleClearHistory = useCallback(() => {
    if (!user?.id) return
    setMoveHistory(clearScheduleHistory(user.id))
  }, [user?.id])

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

  const weekLabel = `${formatDateShort(weekDates[0])} — ${formatDateShort(weekDates[6])}`
  const monthLabel = currentDate.toLocaleString('vi-VN', { month: 'long', year: 'numeric' })

  const roleDescriptions = {
    admin: 'Quản lý lịch học hàng tuần',
    teacher: 'Lịch dạy của bạn',
    student: 'Lịch học của bạn',
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">Thời khóa biểu</h1>
            <PageTourButton />
          </div>
          <p className="text-sm text-gray-500 mt-1">{roleDescriptions[user?.role] || 'Lịch học'}</p>
        </div>
        {canEdit && (
          <Button icon={Plus} data-tour="schedules-add" onClick={() => { setSelectedSlot(null); setSelectedDay(null); setSelectedHour(null); setShowForm(true) }}>
            Thêm lịch học
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3 bg-white/75 backdrop-blur-md rounded-xl border border-white/60 px-4 py-3 shadow-sm">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {[
            { key: 'kanban', label: 'Kanban', icon: Columns3 },
            { key: 'week', label: 'Tuần', icon: Calendar },
            { key: 'month', label: 'Tháng', icon: LayoutGrid },
            { key: 'list', label: 'Danh sách', icon: List },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === key ? 'bg-white text-amber-800 shadow-sm ring-1 ring-amber-100' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {viewMode !== 'kanban' && (
          <div className="flex items-center gap-2">
            <button onClick={() => (viewMode === 'month' ? navigateMonth(-1) : navigateWeek(-1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={goToday} className="px-3 py-1 text-sm font-medium text-amber-700 hover:bg-amber-50 rounded-lg">
              Hôm nay
            </button>
            <button onClick={() => (viewMode === 'month' ? navigateMonth(1) : navigateWeek(1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold text-gray-700 ml-2">
              {viewMode === 'month' ? monthLabel : weekLabel}
            </span>
          </div>
        )}
      </div>

      {(schedules.length > 0 || classOptions.length > 0) && (
        <ScheduleFilterBar
          totalCount={schedules.length}
          filteredCount={filteredSchedules.length}
          classFilter={classFilter}
          onClassFilterChange={setClassFilter}
          classOptions={classOptions}
          subjectFilter={subjectFilter}
          onSubjectFilterChange={setSubjectFilter}
          subjectOptions={subjectOptions}
          timeFilter={timeFilter}
          onTimeFilterChange={setTimeFilter}
          onResetFilters={resetFilters}
          hasActiveFilters={hasActiveFilters}
          showHistory={showHistory}
          onToggleHistory={() => setShowHistory((v) => !v)}
          history={moveHistory}
          onClearHistory={handleClearHistory}
          onUndoMove={handleUndoMove}
          canUndo={canEdit}
        />
      )}

      {todaySlots.length > 0 && (
        <div className="mb-4 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3">
          <p className="text-sm font-semibold text-blue-900 mb-2">
            Hôm nay — {todaySlots.length} ca học
          </p>
          <div className="flex flex-wrap gap-2">
            {todaySlots.map((slot) => {
              const color = colorMap[slot.class_id] || SLOT_COLORS[0]
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => canEdit && handleSlotClick(slot)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${color.bg} ${color.border} ${color.text} ${canEdit ? 'hover:shadow-sm cursor-pointer' : ''}`}
                >
                  <Clock className="h-3 w-3" />
                  {formatTime(slot.start_time)}–{formatTime(slot.end_time)}
                  <span className="opacity-80">· {slot.class_name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : schedules.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {user?.role === 'student' ? 'Bạn chưa có lịch học nào' :
             user?.role === 'teacher' ? 'Bạn chưa có lịch dạy nào' :
             'Chưa có lịch học nào'}
          </p>
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
          <Filter className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Không có ca học phù hợp bộ lọc</p>
          <button type="button" onClick={resetFilters} className="mt-3 text-sm text-amber-700 hover:underline">
            Xóa bộ lọc
          </button>
        </div>
      ) : viewMode === 'kanban' ? (
        <ScheduleKanbanBoard
          schedules={filteredSchedules}
          colorMap={colorMap}
          defaultColors={SLOT_COLORS}
          onSlotClick={canEdit ? handleSlotClick : undefined}
          onAddSlot={canEdit ? (dayKey) => { setSelectedSlot(null); setSelectedDay(dayKey); setSelectedHour(8); setShowForm(true) } : undefined}
          onMoveSlot={canEdit ? handleMoveSlot : undefined}
          interactive={canEdit}
        />
      ) : viewMode === 'week' ? (
        <WeekView
          schedules={filteredSchedules}
          weekDates={weekDates}
          colorMap={colorMap}
          onCellClick={canEdit ? handleCellClick : undefined}
          onSlotClick={canEdit ? handleSlotClick : undefined}
          interactive={canEdit}
        />
      ) : viewMode === 'month' ? (
        <MonthView
          schedules={filteredSchedules}
          currentDate={currentDate}
          colorMap={colorMap}
          onSlotClick={canEdit ? handleSlotClick : undefined}
          interactive={canEdit}
        />
      ) : (
        <ListView schedules={filteredSchedules} colorMap={colorMap} onSlotClick={canEdit ? handleSlotClick : undefined} interactive={canEdit} />
      )}

      {filteredSchedules.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {Object.entries(colorMap).map(([classId, color]) => {
            const slot = filteredSchedules.find((s) => s.class_id === classId) || schedules.find((s) => s.class_id === classId)
            return (
              <div key={classId} className="flex items-center gap-1.5 text-xs text-gray-600">
                <div className={`w-3 h-3 rounded-full ${color.dot}`} />
                <span>{slot?.class_name || slot?.class?.name || 'Lớp học'}</span>
              </div>
            )
          })}
        </div>
      )}

      {canEdit && (
        <>
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
        </>
      )}
    </div>
  )
}

/* ========== WEEK VIEW ========== */
function WeekView({ schedules, weekDates, colorMap, onCellClick, onSlotClick, interactive = true }) {
  const today = new Date()

  // For each cell (date + hour), find which slots are active
  const getSlotStartsAt = (date, hour) => {
    return schedules.find((s) =>
      isSlotActiveOnDate(s, date) && parseTimeHour(s.start_time) === hour
    )
  }

  const getSlotAt = (date, hour) => {
    return schedules.filter((s) =>
      isSlotActiveOnDate(s, date) && parseTimeHour(s.start_time) <= hour && parseTimeHour(s.end_time) > hour
    )
  }

  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-sm border-collapse min-w-[700px]">
        <thead>
          <tr>
            <th className="border border-gray-200 px-2 py-2.5 bg-gray-50 text-gray-500 w-16 text-xs">Giờ</th>
            {DAY_KEYS.map((dayKey, i) => {
              const isToday = weekDates[i].toDateString() === today.toDateString()
              return (
                <th key={i} className={`border border-gray-200 px-2 py-2.5 text-xs min-w-[100px] ${isToday ? 'bg-amber-50 text-amber-800' : 'bg-gray-50 text-gray-600'}`}>
                  <div>{DAYS[i]}</div>
                  <div className={`text-xs font-normal mt-0.5 ${isToday ? 'text-amber-600' : 'text-gray-400'}`}>
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
                const date = weekDates[dayIdx]
                const startSlot = getSlotStartsAt(date, hour)
                const cellSlots = getSlotAt(date, hour)
                const isCovered = cellSlots.length > 0 && !startSlot

                if (isCovered) return null

                if (startSlot) {
                  const startH = parseTimeHour(startSlot.start_time)
                  const endH = parseTimeHour(startSlot.end_time)
                  const span = Math.max(1, endH - startH)
                  const color = colorMap[startSlot.class_id] || SLOT_COLORS[0]

                  return (
                    <td
                      key={dayIdx}
                      rowSpan={span}
                      className={`border border-gray-200 p-0.5 ${interactive ? 'cursor-pointer' : ''}`}
                      onClick={() => onSlotClick && onSlotClick(startSlot)}
                    >
                      <div className={`rounded-lg p-2 h-full border ${color.bg} ${color.border} ${color.text}`}>
                        <p className="font-semibold text-xs leading-tight">{startSlot.class_name || startSlot.class?.name || '—'}</p>
                        <p className="text-xs opacity-70 mt-0.5">{formatTime(startSlot.start_time)} - {formatTime(startSlot.end_time)}</p>
                        {startSlot.teacher_name && (
                          <p className="text-[10px] opacity-65 mt-0.5 truncate">👤 {startSlot.teacher_name}</p>
                        )}
                        {(startSlot.room_name || startSlot.facility?.name) && (
                          <p className="text-xs opacity-60 mt-0.5">📍 {startSlot.room_name || startSlot.facility?.name}</p>
                        )}
                      </div>
                    </td>
                  )
                }

                return (
                  <td
                    key={dayIdx}
                    className={`border border-gray-200 p-0.5 ${interactive ? 'cursor-pointer hover:bg-amber-50/50' : ''} transition-colors`}
                    onClick={() => onCellClick && onCellClick(dayKey, hour, date)}
                  />
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
function MonthView({ schedules, currentDate, colorMap, onSlotClick, interactive = true }) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const weeks = getMonthWeeks(year, month)
  const today = new Date()

  // Get active slots for a specific date
  const getSlotsForDate = (date) => {
    return schedules
      .filter((s) => isSlotActiveOnDate(s, date))
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAYS.map((day, i) => (
          <div key={i} className="px-2 py-2 text-center text-xs font-semibold text-gray-500 bg-gray-50 border-r border-gray-200 last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {weeks.map((weekStart, wIdx) => {
        const dates = getWeekDates(weekStart)
        return (
          <div key={wIdx} className="grid grid-cols-7 border-b border-gray-200 last:border-b-0">
            {dates.map((date, dIdx) => {
              const isCurrentMonth = date.getMonth() === month
              const isToday = date.toDateString() === today.toDateString()
              const daySlots = getSlotsForDate(date)

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
                      : isCurrentMonth ? 'text-gray-700' : 'text-gray-300'
                  }`}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {daySlots.slice(0, 3).map((slot) => {
                      const color = colorMap[slot.class_id] || SLOT_COLORS[0]
                      return (
                        <div
                          key={slot.id}
                          onClick={() => onSlotClick && onSlotClick(slot)}
                          className={`text-xs px-1.5 py-0.5 rounded truncate ${color.bg} ${color.text} ${interactive ? 'cursor-pointer hover:opacity-80' : ''}`}
                          title={`${slot.class_name || ''} ${formatTime(slot.start_time)}-${formatTime(slot.end_time)}`}
                        >
                          <span className="font-medium">{formatTime(slot.start_time)}</span>{' '}
                          <span className="opacity-75">{slot.class_name || ''}</span>
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
function ListView({ schedules, colorMap, onSlotClick, interactive = true }) {
  const dayNames = { 0: 'Chủ nhật', 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7' }

  const sorted = [...schedules].sort((a, b) => {
    const da = (a.day_of_week === 0 ? 7 : a.day_of_week)
    const db = (b.day_of_week === 0 ? 7 : b.day_of_week)
    if (da !== db) return da - db
    return (a.start_time || '').localeCompare(b.start_time || '')
  })

  const grouped = {}
  sorted.forEach((s) => {
    const key = s.day_of_week
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(s)
  })

  // Sort group keys so Monday comes first
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const va = a == 0 ? 7 : Number(a)
    const vb = b == 0 ? 7 : Number(b)
    return va - vb
  })

  const formatDateRangeLocal = (slot) => formatDateRange(slot)

  return (
    <div className="space-y-4">
      {sortedKeys.map((dayKey) => {
        const slots = grouped[dayKey]
        return (
          <div key={dayKey} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700">{dayNames[dayKey] || `Ngày ${dayKey}`}</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {slots.map((slot) => {
                const color = colorMap[slot.class_id] || SLOT_COLORS[0]
                const dateRange = formatDateRangeLocal(slot)
                return (
                  <div
                    key={slot.id}
                    onClick={() => onSlotClick && onSlotClick(slot)}
                    className={`flex items-center gap-4 px-4 py-3 ${interactive ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
                  >
                    <div className={`w-1.5 h-10 rounded-full ${color.dot}`} />
                    <div className="text-sm font-mono text-gray-500 w-28">
                      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{slot.class_name || slot.class?.name || '—'}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-0.5">
                        {slot.teacher_name && <span>👤 {slot.teacher_name}</span>}
                        {(slot.room_name || slot.facility?.name) && (
                          <span>📍 {slot.room_name || slot.facility?.name}</span>
                        )}
                        {dateRange && <span>📅 {dateRange}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

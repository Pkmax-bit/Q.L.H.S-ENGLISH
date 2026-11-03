import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Clock, GripVertical, Loader2, MapPin, Plus, User } from 'lucide-react'

const DAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN']
const DAY_KEYS = [1, 2, 3, 4, 5, 6, 0]

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

function SlotCardContent({ slot, color, dragHandle, moving = false }) {
  const dateRange = formatDateRange(slot)
  const duration = formatDuration(slot.start_time, slot.end_time)
  return (
    <div className={`relative w-full text-left rounded-xl border p-3 pl-8 transition-all ${color.bg} ${color.border} ${moving ? 'opacity-60' : ''}`}>
      {dragHandle}
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
      {dateRange && (
        <p className="text-[10px] mt-1.5 text-slate-500 truncate" title={dateRange}>{dateRange}</p>
      )}
      {moving && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/40">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        </div>
      )}
    </div>
  )
}

function KanbanDraggableCard({ slot, color, onClick, draggable }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: slot.id,
    disabled: !draggable,
  })

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  const dragHandle = draggable ? (
    <span
      className="absolute left-1.5 top-2 p-0.5 rounded text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing touch-none"
      {...listeners}
      onClick={(e) => e.stopPropagation()}
      title="Kéo sang thứ khác"
      aria-hidden="true"
    >
      <GripVertical className="h-4 w-4" />
    </span>
  ) : null

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-30' : ''}>
      <button
        type="button"
        onClick={() => onClick?.(slot)}
        disabled={!onClick}
        className={`w-full text-left ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : 'cursor-default'} transition-all`}
        {...attributes}
      >
        <SlotCardContent slot={slot} color={color} dragHandle={dragHandle} />
      </button>
    </div>
  )
}

function KanbanColumn({ dayKey, label, isToday, count, children, droppable, isOver }) {
  const { setNodeRef } = useDroppable({
    id: `day-${dayKey}`,
    disabled: !droppable,
  })

  return (
    <section
      ref={setNodeRef}
      className={`w-[220px] sm:w-[260px] shrink-0 rounded-2xl bg-white/75 backdrop-blur-md border shadow-sm flex flex-col max-h-[calc(100vh-16rem)] transition-colors ${
        isToday ? 'border-blue-400 ring-2 ring-blue-200/60' : 'border-white/60'
      } ${isOver ? 'ring-2 ring-blue-500 bg-blue-50/40' : ''}`}
    >
      <header className={`px-3 py-2.5 border-b rounded-t-2xl ${isToday ? 'bg-blue-100 border-blue-200' : 'bg-slate-50 border-slate-100/80'}`}>
        <div className="flex items-center justify-between gap-2">
          <h3 className={`text-sm font-bold ${isToday ? 'text-blue-900' : 'text-slate-800'}`}>
            {label}{isToday ? ' · Hôm nay' : ''}
          </h3>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/80 text-slate-600">
            {count}
          </span>
        </div>
      </header>
      {children}
    </section>
  )
}

export default function ScheduleKanbanBoard({
  schedules,
  colorMap,
  defaultColors,
  interactive = false,
  onSlotClick,
  onAddSlot,
  onMoveSlot,
}) {
  const [localSchedules, setLocalSchedules] = useState(schedules)
  const [activeId, setActiveId] = useState(null)
  const [movingId, setMovingId] = useState(null)
  const [overDay, setOverDay] = useState(null)

  useEffect(() => {
    setLocalSchedules(schedules)
  }, [schedules])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )

  const grouped = useMemo(() => {
    const map = Object.fromEntries(DAY_KEYS.map((k) => [k, []]))
    localSchedules.forEach((slot) => {
      const key = slot.day_of_week
      if (key in map) map[key].push(slot)
    })
    DAY_KEYS.forEach((key) => {
      map[key].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
    })
    return map
  }, [localSchedules])

  const activeSlot = activeId ? localSchedules.find((s) => s.id === activeId) : null

  const resolveTargetDay = useCallback((overId) => {
    const id = String(overId)
    if (id.startsWith('day-')) return Number(id.slice(4))
    const target = localSchedules.find((s) => s.id === overId)
    return target?.day_of_week ?? null
  }, [localSchedules])

  const handleDragStart = ({ active }) => {
    setActiveId(active.id)
  }

  const handleDragOver = ({ over }) => {
    if (!over) {
      setOverDay(null)
      return
    }
    setOverDay(resolveTargetDay(over.id))
  }

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null)
    setOverDay(null)
    if (!over || !interactive || !onMoveSlot) return

    const slotId = active.id
    const slot = localSchedules.find((s) => s.id === slotId)
    const targetDay = resolveTargetDay(over.id)
    if (!slot || targetDay == null || slot.day_of_week === targetDay) return

    const prev = localSchedules
    setLocalSchedules((list) =>
      list.map((s) => (s.id === slotId ? { ...s, day_of_week: targetDay } : s)),
    )
    setMovingId(slotId)
    try {
      await onMoveSlot(slotId, targetDay, { fromDay: slot.day_of_week })
    } catch {
      setLocalSchedules(prev)
    } finally {
      setMovingId(null)
    }
  }

  const handleDragCancel = () => {
    setActiveId(null)
    setOverDay(null)
  }

  const todayDow = new Date().getDay()

  return (
    <div className="space-y-2">
      {interactive && (
        <p className="text-xs text-slate-500 flex items-center gap-1.5 px-1">
          <GripVertical className="h-3.5 w-3.5" />
          Kéo thả ca học sang cột thứ khác để đổi ngày trong tuần
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="overflow-x-auto pb-2 -mx-1 px-1">
          <div className="flex gap-3 min-w-max">
            {DAY_KEYS.map((dayKey, i) => {
              const slots = grouped[dayKey] || []
              const isToday = dayKey === todayDow
              return (
                <KanbanColumn
                  key={dayKey}
                  dayKey={dayKey}
                  label={DAY_LABELS[i]}
                  isToday={isToday}
                  count={slots.length}
                  droppable={interactive}
                  isOver={overDay === dayKey}
                >
                  <ul className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px] [scrollbar-width:thin]">
                    {slots.map((slot) => {
                      const slotColor = colorMap[slot.class_id] || defaultColors[0]
                      return (
                        <li key={slot.id}>
                          <KanbanDraggableCard
                            slot={slot}
                            color={slotColor}
                            onClick={onSlotClick}
                            draggable={interactive && !movingId}
                          />
                          {movingId === slot.id && (
                            <div className="mt-1 text-[10px] text-center text-blue-600">Đang lưu…</div>
                          )}
                        </li>
                      )
                    })}
                    {slots.length === 0 && (
                      <li className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                        {interactive ? 'Thả ca vào đây' : 'Chưa có ca học'}
                      </li>
                    )}
                  </ul>

                  {interactive && onAddSlot && (
                    <div className="p-2 border-t border-slate-100/80">
                      <button
                        type="button"
                        onClick={() => onAddSlot(dayKey)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Thêm ca
                      </button>
                    </div>
                  )}
                </KanbanColumn>
              )
            })}
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 180 }}>
          {activeSlot ? (
            <div className="w-[240px] shadow-xl rotate-1 scale-[1.02]">
              <SlotCardContent
                slot={activeSlot}
                color={colorMap[activeSlot.class_id] || defaultColors[0]}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

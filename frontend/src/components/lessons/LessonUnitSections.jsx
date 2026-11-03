import { useEffect, useMemo, useState } from 'react'
import { BookOpen, CheckCircle2, ChevronDown, FileText, HardDrive, Youtube } from 'lucide-react'
import SearchBar from '../common/SearchBar'
import { CURRICULUM_TRACKS, filterCurriculumUnits, groupLessonsIntoUnits } from '../../utils/lessonCurriculum'

const CONTENT_ICONS = {
  text: FileText,
  file: HardDrive,
  video: Youtube,
  youtube: Youtube,
  drive: HardDrive,
}

const KIND_STYLES = {
  'Bài 1': 'bg-amber-100 text-amber-800',
  'Bài 2': 'bg-amber-100 text-amber-800',
  'Bài 3': 'bg-amber-50 text-amber-700',
  'Mở rộng': 'bg-sky-100 text-sky-800',
  'Mini Test': 'bg-violet-100 text-violet-800',
  'Từ vựng': 'bg-emerald-100 text-emerald-800',
  'Luyện tập': 'bg-orange-100 text-orange-800',
  'Bài học': 'bg-gray-100 text-gray-600',
}

const SKILL_STYLES = {
  Nghe: 'bg-sky-50 text-sky-700 border-sky-200',
  Đọc: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Ôn tập': 'bg-amber-50 text-amber-800 border-amber-200',
  '4 kỹ năng': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Tổng quan': 'bg-slate-50 text-slate-700 border-slate-200',
  Khác: 'bg-gray-50 text-gray-600 border-gray-200',
}

function kindClass(kind) {
  if (KIND_STYLES[kind]) return KIND_STYLES[kind]
  if (String(kind).startsWith('Bài')) return 'bg-amber-100 text-amber-800'
  return 'bg-gray-100 text-gray-600'
}

export default function LessonUnitSections({
  lessons = [],
  onItemClick,
  renderActions,
  renderExtra,
  showClassName = false,
  progressMap = {},
  searchable = true,
  searchPlaceholder = 'Tìm bài học, unit, kỹ năng...',
  emptyMessage = 'Chưa có bài học nào',
}) {
  const [search, setSearch] = useState('')
  const [track, setTrack] = useState('all')
  const [openKeys, setOpenKeys] = useState({})

  const allUnits = useMemo(() => groupLessonsIntoUnits(lessons), [lessons])

  useEffect(() => {
    setOpenKeys((prev) => {
      if (Object.keys(prev).length > 0 || !allUnits[0]) return prev
      return { [allUnits[0].key]: true }
    })
  }, [allUnits])
  const units = useMemo(
    () => filterCurriculumUnits(allUnits, { search, track }),
    [allUnits, search, track]
  )

  const isFiltering = Boolean(search.trim()) || track !== 'all'
  const allOpen = units.length > 0 && units.every((unit) => isFiltering || openKeys[unit.key])

  const toggleUnit = (key) => {
    setOpenKeys((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleAll = () => {
    if (allOpen) {
      setOpenKeys({})
      return
    }
    const next = {}
    units.forEach((unit) => { next[unit.key] = true })
    setOpenKeys(next)
  }

  if (lessons.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {(searchable || allUnits.length > 1) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {searchable ? (
            <SearchBar value={search} onChange={setSearch} placeholder={searchPlaceholder} />
          ) : (
            <div />
          )}
          <div className="flex flex-wrap items-center gap-2">
            {CURRICULUM_TRACKS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTrack(item.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  track === item.id
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={toggleAll}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            >
              {allOpen ? 'Thu gọn' : 'Mở tất cả'}
            </button>
          </div>
        </div>
      )}

      {units.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-500">
          Không có bài học khớp bộ lọc
        </div>
      ) : (
        <div className="space-y-3">
          {units.map((unit) => {
            const open = isFiltering || Boolean(openKeys[unit.key])
            return (
              <section key={unit.key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleUnit(unit.key)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-semibold uppercase leading-none">Unit</span>
                    <span className="text-sm font-bold leading-tight">
                      {unit.unit != null ? String(unit.unit).padStart(2, '0') : '—'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">{unit.topic}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${SKILL_STYLES[unit.skill] || SKILL_STYLES.Khác}`}>
                        {unit.skill}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {unit.title} · {unit.items.length} bài
                    </p>
                  </div>
                  <ChevronDown className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                  <div className="border-t border-gray-100 divide-y divide-gray-100">
                    {unit.items.map((item, idx) => {
                      const Icon = CONTENT_ICONS[item.lesson.content_type] || FileText
                      const className = item.lesson.class?.name || item.lesson.class_name
                      return (
                        <div
                          key={item.lesson.id}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-amber-50/40 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => onItemClick?.(item.lesson)}
                            className="flex items-start gap-3 min-w-0 flex-1 text-left"
                          >
                            <span className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                              {item.lesson.order_index ?? idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-semibold ${kindClass(item.kind)}`}>
                                  {item.kind}
                                </span>
                                <span className="text-sm font-medium text-gray-800 group-hover:text-amber-800">
                                  {item.shortTitle}
                                </span>
                                {progressMap[item.lesson.id]?.status === 'completed' && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Xong
                                  </span>
                                )}
                                {progressMap[item.lesson.id]?.status === 'in_progress' && (
                                  <span className="text-[11px] font-semibold text-amber-700">Đang học</span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-400">
                                <span className="inline-flex items-center gap-1">
                                  <Icon className="h-3 w-3" />
                                  {item.lesson.content_type || 'text'}
                                </span>
                                {showClassName && className && <span>{className}</span>}
                              </div>
                              {renderExtra?.(item.lesson)}
                            </div>
                          </button>
                          {renderActions && (
                            <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                              {renderActions(item.lesson)}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

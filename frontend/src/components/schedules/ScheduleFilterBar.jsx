import { BookOpen, Clock, Filter, History, RotateCcw, X } from 'lucide-react'
import { TIME_FILTER_OPTIONS } from '../../utils/schedulePreferences'

const DAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN']
const DAY_KEYS = [1, 2, 3, 4, 5, 6, 0]

function dayLabel(dow) {
  const i = DAY_KEYS.indexOf(Number(dow))
  return i >= 0 ? DAY_LABELS[i] : `T${dow}`
}

function formatHistoryTime(iso) {
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export default function ScheduleFilterBar({
  totalCount,
  filteredCount,
  classFilter,
  onClassFilterChange,
  classOptions,
  subjectFilter,
  onSubjectFilterChange,
  subjectOptions,
  timeFilter,
  onTimeFilterChange,
  onResetFilters,
  hasActiveFilters,
  showHistory,
  onToggleHistory,
  history,
  onClearHistory,
  onUndoMove,
  canUndo,
}) {
  return (
    <div className="mb-4 space-y-3">
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-md shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <Filter className="h-4 w-4 text-slate-500 shrink-0" />
          <span className="text-sm font-semibold text-slate-700">Bộ lọc</span>
          <span className="text-xs text-slate-400 ml-auto">
            {filteredCount}/{totalCount} ca
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 px-2 py-1 rounded-lg hover:bg-amber-50"
            >
              <RotateCcw className="h-3 w-3" />
              Xóa lọc
            </button>
          )}
          <button
            type="button"
            onClick={onToggleHistory}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
              showHistory
                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                : 'text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            Lịch sử {history.length > 0 && `(${history.length})`}
          </button>
        </div>

        <div className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Lớp học</span>
            <select
              value={classFilter}
              onChange={(e) => onClassFilterChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="all">Tất cả lớp</option>
              {classOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <BookOpen className="h-3 w-3" /> Môn học
            </span>
            <select
              value={subjectFilter}
              onChange={(e) => onSubjectFilterChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="all">Tất cả môn</option>
              {subjectOptions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>
              ))}
            </select>
          </label>

          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <Clock className="h-3 w-3" /> Khung giờ
            </span>
            <div className="flex flex-wrap gap-1.5">
              {TIME_FILTER_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onTimeFilterChange(value)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    timeFilter === value
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showHistory && (
        <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-indigo-100 bg-white/60">
            <p className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
              <History className="h-4 w-4" />
              Lịch sử thay đổi TKB
            </p>
            {history.length > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                className="text-xs text-indigo-600 hover:text-indigo-900 font-medium"
              >
                Xóa tất cả
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500 text-center">Chưa có thay đổi nào được ghi lại</p>
          ) : (
            <ul className="max-h-48 overflow-y-auto divide-y divide-indigo-100/80">
              {history.map((item) => (
                <li key={item.id} className="px-4 py-2.5 flex items-start gap-3 text-sm bg-white/40 hover:bg-white/70">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{item.className || 'Ca học'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {dayLabel(item.fromDay)} → {dayLabel(item.toDay)}
                      {item.startTime ? ` · ${String(item.startTime).substring(0, 5)}` : ''}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatHistoryTime(item.at)}</p>
                  </div>
                  {canUndo && item.type === 'move' && item.undone !== true && (
                    <button
                      type="button"
                      onClick={() => onUndoMove(item)}
                      className="shrink-0 text-xs font-medium text-indigo-700 hover:text-indigo-900 px-2 py-1 rounded-lg border border-indigo-200 bg-white hover:bg-indigo-50"
                      title="Hoàn tác"
                    >
                      Hoàn tác
                    </button>
                  )}
                  {item.undone && (
                    <span className="text-[10px] text-slate-400 shrink-0">Đã hoàn tác</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 px-1">
          {classFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-full px-2.5 py-1">
              Lớp: {classOptions.find((c) => String(c.id) === String(classFilter))?.name}
              <button type="button" onClick={() => onClassFilterChange('all')} className="hover:text-amber-950"><X className="h-3 w-3" /></button>
            </span>
          )}
          {subjectFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full px-2.5 py-1">
              Môn: {subjectOptions.find((s) => String(s.id) === String(subjectFilter))?.name}
              <button type="button" onClick={() => onSubjectFilterChange('all')} className="hover:text-emerald-950"><X className="h-3 w-3" /></button>
            </span>
          )}
          {timeFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-800 border border-blue-200 rounded-full px-2.5 py-1">
              {TIME_FILTER_OPTIONS.find((t) => t.value === timeFilter)?.label}
              <button type="button" onClick={() => onTimeFilterChange('all')} className="hover:text-blue-950"><X className="h-3 w-3" /></button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

const PREFS_KEY = (uid) => `qlhs:schedule:prefs:${uid || 'guest'}`
const HISTORY_KEY = (uid) => `qlhs:schedule:history:${uid || 'guest'}`
const MAX_HISTORY = 50

export const TIME_FILTER_OPTIONS = [
  { value: 'all', label: 'Cả ngày' },
  { value: 'morning', label: 'Sáng (6h–12h)' },
  { value: 'afternoon', label: 'Chiều (12h–17h)' },
  { value: 'evening', label: 'Tối (17h–22h)' },
]

const TIME_RANGES = {
  morning: { from: '06:00', to: '12:00' },
  afternoon: { from: '12:00', to: '17:00' },
  evening: { from: '17:00', to: '22:00' },
}

export function parseTimeMinutes(timeStr) {
  if (!timeStr) return 0
  const [h, m = 0] = String(timeStr).split(':').map(Number)
  return h * 60 + m
}

export function matchesTimeFilter(slot, timeFilter) {
  if (!timeFilter || timeFilter === 'all') return true
  const range = TIME_RANGES[timeFilter]
  if (!range) return true
  const start = parseTimeMinutes(slot.start_time)
  const from = parseTimeMinutes(range.from)
  const to = parseTimeMinutes(range.to)
  return start >= from && start < to
}

export function loadSchedulePrefs(userId) {
  try {
    const raw = localStorage.getItem(PREFS_KEY(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return {
      viewMode: parsed.viewMode || 'kanban',
      classFilter: parsed.classFilter || 'all',
      subjectFilter: parsed.subjectFilter || 'all',
      timeFilter: parsed.timeFilter || 'all',
      showHistory: Boolean(parsed.showHistory),
    }
  } catch {
    return null
  }
}

export function saveSchedulePrefs(userId, prefs) {
  try {
    localStorage.setItem(PREFS_KEY(userId), JSON.stringify(prefs))
  } catch { /* ignore quota */ }
}

export function loadScheduleHistory(userId) {
  try {
    const raw = localStorage.getItem(HISTORY_KEY(userId))
    if (!raw) return []
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function appendScheduleHistory(userId, entry) {
  const list = loadScheduleHistory(userId)
  const next = [{ ...entry, id: entry.id || crypto.randomUUID(), at: entry.at || new Date().toISOString() }, ...list].slice(0, MAX_HISTORY)
  try {
    localStorage.setItem(HISTORY_KEY(userId), JSON.stringify(next))
  } catch { /* ignore */ }
  return next
}

export function markScheduleHistoryUndone(userId, itemId) {
  const list = loadScheduleHistory(userId).map((h) =>
    h.id === itemId ? { ...h, undone: true } : h,
  )
  try {
    localStorage.setItem(HISTORY_KEY(userId), JSON.stringify(list))
  } catch { /* ignore */ }
  return list
}

export function clearScheduleHistory(userId) {
  try {
    localStorage.removeItem(HISTORY_KEY(userId))
  } catch { /* ignore */ }
  return []
}

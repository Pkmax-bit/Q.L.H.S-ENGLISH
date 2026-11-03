const TCO_TITLE_RE = /^TCO\s*550\+\s*[·•|]\s*Unit\s*0?(\d+)\s*[·•|]\s*(.+)$/i

export const TCO_UNITS = {
  1: { topic: 'Làm quen TOEIC 550+', skill: 'Tổng quan', track: 'overview' },
  2: { topic: 'Part 1 — Photographs (người)', skill: 'Nghe', track: 'listening' },
  3: { topic: 'Part 1 — Photographs (vật & cảnh)', skill: 'Nghe', track: 'listening' },
  4: { topic: 'Part 2 — Câu hỏi Wh-', skill: 'Nghe', track: 'listening' },
  5: { topic: 'Part 2 — Yes/No', skill: 'Nghe', track: 'listening' },
  6: { topic: 'Part 2 — Statement', skill: 'Nghe', track: 'listening' },
  7: { topic: 'Part 3 — Gist', skill: 'Nghe', track: 'listening' },
  8: { topic: 'Part 3 — Detail', skill: 'Nghe', track: 'listening' },
  9: { topic: 'Part 3 — Inference', skill: 'Nghe', track: 'listening' },
  10: { topic: 'Part 4 — Announcements', skill: 'Nghe', track: 'listening' },
  11: { topic: 'Part 4 — Talks', skill: 'Nghe', track: 'listening' },
  12: { topic: 'Part 4 — Messages', skill: 'Nghe', track: 'listening' },
  13: { topic: 'Part 5 — Word form', skill: 'Đọc', track: 'reading' },
  14: { topic: 'Part 5 — Tenses', skill: 'Đọc', track: 'reading' },
  15: { topic: 'Part 5 — Passive / to-V', skill: 'Đọc', track: 'reading' },
  16: { topic: 'Part 5 — Giới từ & liên từ', skill: 'Đọc', track: 'reading' },
  17: { topic: 'Part 6 — Text completion', skill: 'Đọc', track: 'reading' },
  18: { topic: 'Part 7 — Email / thư', skill: 'Đọc', track: 'reading' },
  19: { topic: 'Part 7 — Quảng cáo', skill: 'Đọc', track: 'reading' },
  20: { topic: 'Part 7 — Double passage', skill: 'Đọc', track: 'reading' },
  21: { topic: 'Part 7 — Triple passage', skill: 'Đọc', track: 'reading' },
  22: { topic: 'Ôn Listening Part 1–2', skill: 'Ôn tập', track: 'review' },
  23: { topic: 'Ôn Listening Part 3–4', skill: 'Ôn tập', track: 'review' },
  24: { topic: 'Ôn Reading Part 5–6', skill: 'Ôn tập', track: 'review' },
  25: { topic: 'Ôn Reading Part 7', skill: 'Ôn tập', track: 'review' },
  26: { topic: 'Chiến lược thời gian', skill: 'Ôn tập', track: 'review' },
  27: { topic: 'Mini full practice (1)', skill: 'Ôn tập', track: 'review' },
  28: { topic: 'Mini full practice (2)', skill: 'Ôn tập', track: 'review' },
  29: { topic: 'Tổng kết 4 kỹ năng', skill: '4 kỹ năng', track: 'review' },
}

export const CURRICULUM_TRACKS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'listening', label: 'Nghe' },
  { id: 'reading', label: 'Đọc' },
  { id: 'review', label: 'Ôn tập' },
]

export function parseTcoLesson(lesson) {
  const title = String(lesson?.title || '').trim()
  const match = title.match(TCO_TITLE_RE)
  if (!match) return null

  const unit = Number(match[1])
  const rest = match[2].trim()
  let kind = 'Bài học'
  let shortTitle = rest

  const lessonMatch = rest.match(/^Lesson\s+(\d+)\s*[—–-]\s*(.+)$/i)
  if (lessonMatch) {
    kind = `Bài ${lessonMatch[1]}`
    shortTitle = lessonMatch[2].trim()
  } else if (/^Extension\b/i.test(rest)) {
    kind = 'Mở rộng'
    shortTitle = rest.replace(/^Extension\s*[—–-]\s*/i, '').trim()
  } else if (/^Mini\s*Test\b/i.test(rest)) {
    kind = 'Mini Test'
    shortTitle = rest.replace(/^Mini\s*Test\s*[—–-]\s*/i, '').trim()
  } else if (/^Vocabulary\b/i.test(rest)) {
    kind = 'Từ vựng'
    shortTitle = rest.replace(/^Vocabulary\s*[—–-]\s*/i, '').trim()
  } else if (/^Practice\b/i.test(rest)) {
    kind = 'Luyện tập'
    shortTitle = rest.replace(/^Practice\s*[—–-]\s*/i, '').trim()
  }

  return { unit, kind, shortTitle, rest }
}

export function hasTcoCurriculum(lessons = []) {
  return lessons.some((lesson) => parseTcoLesson(lesson))
}

function sortItems(items) {
  return [...items].sort((a, b) => {
    const order = (a.lesson.order_index ?? 999) - (b.lesson.order_index ?? 999)
    if (order !== 0) return order
    return String(a.shortTitle || '').localeCompare(String(b.shortTitle || ''), 'vi')
  })
}

export function groupLessonsIntoUnits(lessons = []) {
  const unitsMap = new Map()
  const others = []

  lessons.forEach((lesson) => {
    const parsed = parseTcoLesson(lesson)
    if (!parsed) {
      others.push({
        lesson,
        unit: null,
        kind: 'Bài học',
        shortTitle: lesson.title || 'Bài học',
        rest: lesson.title || '',
      })
      return
    }
    if (!unitsMap.has(parsed.unit)) unitsMap.set(parsed.unit, [])
    unitsMap.get(parsed.unit).push({ lesson, ...parsed })
  })

  const units = [...unitsMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([unit, items]) => {
      const meta = TCO_UNITS[unit] || {
        topic: `Unit ${String(unit).padStart(2, '0')}`,
        skill: 'Bài học',
        track: 'other',
      }
      return {
        key: `unit-${unit}`,
        unit,
        title: `Unit ${String(unit).padStart(2, '0')}`,
        topic: meta.topic,
        skill: meta.skill,
        track: meta.track,
        items: sortItems(items),
      }
    })

  if (others.length) {
    units.push({
      key: 'other',
      unit: null,
      title: 'Bài học khác',
      topic: 'Không thuộc giáo trình TOEIC Compact 550+',
      skill: 'Khác',
      track: 'other',
      items: sortItems(others),
    })
  }

  return units
}

export function filterCurriculumUnits(units, { search = '', track = 'all' } = {}) {
  const query = search.trim().toLowerCase()

  return units
    .filter((unit) => track === 'all' || unit.track === track || unit.track === 'other')
    .map((unit) => {
      if (!query) return unit
      const unitHaystack = `${unit.title} ${unit.topic} ${unit.skill}`.toLowerCase()
      if (unitHaystack.includes(query)) return unit
      return {
        ...unit,
        items: unit.items.filter((item) => {
          const haystack = `${item.shortTitle} ${item.kind} ${item.rest} ${item.lesson.title || ''}`.toLowerCase()
          return haystack.includes(query)
        }),
      }
    })
    .filter((unit) => unit.items.length > 0)
}

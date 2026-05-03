/** Đọc — 100 câu (ETS LR): Part 5 (30) + Part 6 (16) + Part 7 (54) */

export const TOEIC_READING_QUESTIONS = 100

export const READING_PART_RANGES = [
  {
    part: 5,
    label: 'Part 5 — Incomplete Sentences',
    start: 0,
    end: 29,
    choices: 4,
    note: '30 câu — chọn từ/cụm từ thích hợp hoàn thành câu.',
  },
  {
    part: 6,
    label: 'Part 6 — Text Completion',
    start: 30,
    end: 45,
    choices: 4,
    note: '4 đoạn × 4 chỗ trống (16 câu).',
  },
  {
    part: 7,
    label: 'Part 7 — Reading Comprehension',
    start: 46,
    end: 99,
    choices: 4,
    note: 'Đoạn đơn / đôi / ba — tổng 54 câu.',
  },
]

/**
 * @param {number} indexZero — 0..99 trong khối Reading
 */
export function getToeicReadingMeta(indexZero) {
  if (indexZero < 0 || indexZero > 99) {
    return { part: null, label: '', choices: 4, groupIndex: null, indexInGroup: null }
  }
  if (indexZero <= 29) {
    return { part: 5, label: 'Part 5', choices: 4, groupIndex: null, indexInGroup: null }
  }
  if (indexZero <= 45) {
    const g = Math.floor((indexZero - 30) / 4)
    return {
      part: 6,
      label: 'Part 6',
      choices: 4,
      groupIndex: g,
      indexInGroup: indexZero - 30 - g * 4,
    }
  }
  const i7 = indexZero - 46
  return {
    part: 7,
    label: 'Part 7',
    choices: 4,
    groupIndex: null,
    indexInGroup: null,
    indexInPart7: i7,
  }
}

export function emptyMcqOptions(count) {
  return Array.from({ length: count }, () => ({ text: '', is_correct: false }))
}

export function buildToeicReadingSkeletonQuestions() {
  const rows = []
  for (let i = 0; i < TOEIC_READING_QUESTIONS; i++) {
    const meta = getToeicReadingMeta(i)
    let stem = ''
    if (meta.part === 6 && meta.indexInGroup === 0) {
      stem = `<p><strong>Đoạn ${(meta.groupIndex ?? 0) + 1}</strong> — Điền vào chỗ trống.</p>`
    } else if (meta.part === 7 && meta.indexInPart7 === 0) {
      stem = '<p><strong>Bài đọc</strong> — Đọc và trả lời.</p>'
    } else if (meta.part === 5) {
      stem = '<p>Chọn đáp án đúng nhất để hoàn thành câu.</p>'
    }
    rows.push({
      text: stem,
      question_type: 'multiple_choice',
      points: 1,
      options: emptyMcqOptions(4),
      correct_answer: '',
      file_url: '',
      youtube_url: '',
    })
  }
  return rows
}

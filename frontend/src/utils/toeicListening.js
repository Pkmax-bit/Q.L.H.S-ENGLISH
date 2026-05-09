/** Loại bài gán trong assignments.assignment_type */
export const ASSIGNMENT_TYPE_TOEIC_LISTENING = 'toeic_listening'

/** Chuẩn đề Listening đầy đủ (theo spec TOEIC) */
export const TOEIC_FULL_QUESTIONS = 100

/**
 * Khung 100 câu TOEIC Listening chuẩn: P1 có 4 lựa chọn, P2/P3 có 3 — dùng nhận diện khi
 * assignment_type bị lưu nhầm `mixed` nhưng nội dung vẫn là đề Listening đầy đủ.
 */
export function looksLikeToeicListeningSkeleton(questions) {
  if (!Array.isArray(questions) || questions.length !== TOEIC_FULL_QUESTIONS) return false
  const q0 = questions[0]
  const q6 = questions[6]
  const q31 = questions[31]
  const isMcq = (q) => q && q.question_type === 'multiple_choice'
  if (!isMcq(q0) || !isMcq(q6) || !isMcq(q31)) return false
  const n0 = (q0.options || []).length
  const n6 = (q6.options || []).length
  const n31 = (q31.options || []).length
  return n0 === 4 && n6 === 3 && n31 === 3
}

/**
 * Dùng màn TakeToeicListening (10s chuẩn bị + autoplay liên tục, nghỉ 5s mỗi câu) thay vì TakeAssignment.
 *
 * Điều kiện kích hoạt (chấp nhận sai cấu hình `assignment_type` để không phụ thuộc lựa chọn của giáo viên):
 *   1. assignment_type === 'toeic_listening', HOẶC
 *   2. Khung 100 câu khớp fingerprint Listening (P1: 4 lựa chọn, P2/P3: 3), HOẶC
 *   3. Có ít nhất 1 câu trắc nghiệm có audio (youtube_url khác rỗng) trong toàn bộ đề.
 */
export function shouldUseTakeToeicListeningShell(assignment) {
  if (!assignment) return false
  if (assignment.assignment_type === ASSIGNMENT_TYPE_TOEIC_LISTENING) return true
  const questions = Array.isArray(assignment.questions) ? assignment.questions : []
  if (looksLikeToeicListeningSkeleton(questions)) return true
  const hasMcqAudio = questions.some(
    (q) =>
      q &&
      q.question_type === 'multiple_choice' &&
      typeof q.youtube_url === 'string' &&
      q.youtube_url.trim() !== ''
  )
  return hasMcqAudio
}

export const TOEIC_PART_RANGES = [
  { part: 1, label: 'Part 1 — Mô tả hình ảnh', start: 0, end: 5, choices: 4, note: 'Mỗi câu: 1 ảnh + nghe 4 lựa chọn' },
  { part: 2, label: 'Part 2 — Hỏi & đáp', start: 6, end: 30, choices: 3, note: '3 lựa chọn (A, B, C)' },
  { part: 3, label: 'Part 3 — Hội thoại ngắn', start: 31, end: 69, choices: 3, note: '13 đoạn × 3 câu' },
  { part: 4, label: 'Part 4 — Bài nói ngắn', start: 70, end: 99, choices: 3, note: '10 bài × 3 câu' },
]

/**
 * @param {number} indexZero — chỉ số câu sau khi sort theo order_index (0-based)
 */
export function getToeicListeningMeta(indexZero) {
  if (indexZero < 0) return { part: null, label: '', choices: 4, groupIndex: null, indexInGroup: null }
  if (indexZero <= 5) {
    return { part: 1, label: 'Part 1', choices: 4, groupIndex: null, indexInGroup: null }
  }
  if (indexZero <= 30) {
    return { part: 2, label: 'Part 2', choices: 3, groupIndex: null, indexInGroup: null }
  }
  if (indexZero <= 69) {
    const g = Math.floor((indexZero - 31) / 3)
    return { part: 3, label: 'Part 3', choices: 3, groupIndex: g, indexInGroup: indexZero - 31 - g * 3 }
  }
  const g = Math.floor((indexZero - 70) / 3)
  return { part: 4, label: 'Part 4', choices: 3, groupIndex: g, indexInGroup: indexZero - 70 - g * 3 }
}

/**
 * Quy đổi tuyến tính sang thang Listening 5–495 (ước lượng; ETS dùng bảng điểm phức tạp hơn).
 */
export function toeicListeningScaledScore(correct, total) {
  if (!total || total <= 0) return 5
  const r = Math.max(0, Math.min(1, correct / total))
  return Math.round(5 + r * (495 - 5))
}

/** Audio chung cho nhóm Part 3 / Part 4 */
export function pickGroupAudioUrl(questions, part, groupIndex) {
  if (part !== 3 && part !== 4) return null
  const g = groupIndex ?? 0
  const base = part === 3 ? 31 : 70
  for (let k = 0; k < 3; k++) {
    const q = questions[base + g * 3 + k]
    const u = q?.youtube_url?.trim()
    if (u) return u
  }
  return null
}

/** URL có thể dùng làm thẻ <audio src> — chấp nhận file trực tiếp, blob, hoặc link Google Drive. */
export function isDirectAudioUrl(url) {
  if (!url || typeof url !== 'string') return false
  const u = url.trim()
  const lower = u.toLowerCase()
  if (/\.(mp3|wav|ogg|m4a|aac)(\?|#|$)/i.test(lower)) return true
  if (lower.startsWith('blob:')) return true
  if (/^https?:\/\/(?:[^/]*\.)?(?:drive\.google\.com|docs\.google\.com|drive\.usercontent\.google\.com)\//i.test(u)) {
    return true
  }
  return false
}

export function emptyMcqOptions(count) {
  return Array.from({ length: count }, () => ({ text: '', is_correct: false }))
}

/** Khung 100 câu trắc nghiệm đúng cấu trúc Part 1–4 */
/** Part 1: câu 0–5 — gán audio từng câu (mỗi câu một file) */
export function assignAudiosToPart1Rows(audioUrls, questions) {
  const copy = questions.map((q) => ({ ...q }))
  const n = Math.min(6, audioUrls.length, copy.length)
  for (let i = 0; i < n; i++) {
    copy[i] = { ...copy[i], youtube_url: audioUrls[i] || '' }
  }
  return copy
}

/** Part 1: câu index 0–5 → ảnh file_url */
export function assignImagesToPart1(imageUrls, questions) {
  const copy = questions.map((q) => ({ ...q }))
  const n = Math.min(6, imageUrls.length, copy.length)
  for (let i = 0; i < n; i++) {
    copy[i] = { ...copy[i], file_url: imageUrls[i] || '' }
  }
  return copy
}

/** Part 2: câu index 6–30 → mỗi câu một audio youtube_url */
export function assignAudiosToPart2(audioUrls, questions) {
  const copy = questions.map((q) => ({ ...q }))
  const start = 6
  const max = 25
  const n = Math.min(max, audioUrls.length, copy.length - start)
  for (let i = 0; i < n; i++) {
    const idx = start + i
    copy[idx] = { ...copy[idx], youtube_url: audioUrls[i] || '' }
  }
  return copy
}

/** Part 3: 13 nhóm, audio ở câu đầu mỗi nhóm (index 31+3g) */
export function assignAudiosToPart3Groups(audioUrls, questions) {
  const copy = questions.map((q) => ({ ...q }))
  const groups = 13
  const n = Math.min(groups, audioUrls.length)
  for (let g = 0; g < n; g++) {
    const idx = 31 + g * 3
    if (idx < copy.length) {
      copy[idx] = { ...copy[idx], youtube_url: audioUrls[g] || '' }
    }
  }
  return copy
}

/** Part 4: 10 nhóm, audio ở câu đầu (index 70+3g) */
export function assignAudiosToPart4Groups(audioUrls, questions) {
  const copy = questions.map((q) => ({ ...q }))
  const groups = 10
  const n = Math.min(groups, audioUrls.length)
  for (let g = 0; g < n; g++) {
    const idx = 70 + g * 3
    if (idx < copy.length) {
      copy[idx] = { ...copy[idx], youtube_url: audioUrls[g] || '' }
    }
  }
  return copy
}

/** Gán audio liên tiếp vào mọi câu Part 3 & 4 (mỗi câu một file) — ít dùng; ưu tiên nhóm. */
export function assignAudiosSequentialPart34(audioUrls, questions, startIndex = 31) {
  const copy = questions.map((q) => ({ ...q }))
  let k = 0
  for (let idx = startIndex; idx < copy.length && k < audioUrls.length; idx++) {
    copy[idx] = { ...copy[idx], youtube_url: audioUrls[k++] || '' }
  }
  return copy
}

/**
 * Dán từ Excel: mỗi dòng phân tách bằng TAB hoặc |
 * 4 đáp án: Câu\\tA\\tB\\tC\\tD\\tĐúng (Đúng = A|B|C|D)
 * 3 đáp án: Câu\\tA\\tB\\tC\\tĐúng (Đúng = A|B|C)
 */
export function parseBulkToeicQuestionLines(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const rows = []
  for (const line of lines) {
    const parts = line.includes('\t')
      ? line.split('\t').map((s) => s.trim())
      : line.split('|').map((s) => s.trim())
    if (parts.length < 5) continue
    const stem = parts[0]
    if (parts.length >= 6) {
      const ans = parts[5].trim().toUpperCase()
      const opts = parts.slice(1, 5).map((t) => ({ text: t, is_correct: false }))
      const ci = 'ABCD'.indexOf(ans.charAt(0))
      if (ci >= 0) opts[ci].is_correct = true
      rows.push({ stem, options: opts })
    } else if (parts.length === 5) {
      const ans = parts[4].trim().toUpperCase()
      const opts = parts.slice(1, 4).map((t) => ({ text: t, is_correct: false }))
      const ci = 'ABC'.indexOf(ans.charAt(0))
      if (ci >= 0) opts[ci].is_correct = true
      rows.push({ stem, options: opts })
    }
  }
  return rows
}

/**
 * Gộp câu từ API import Excel (sheet Part 1 / Trắc nghiệm) vào khung TOEIC 100 câu theo thứ tự dòng.
 * Ghi đè file_url / youtube_url nếu Excel có cột URL ảnh / âm thanh.
 */
export function mergeParsedExcelIntoToeicSkeleton(skeletonQuestions, excelQuestions) {
  if (!Array.isArray(skeletonQuestions) || !Array.isArray(excelQuestions)) {
    return skeletonQuestions
  }
  const copy = skeletonQuestions.map((q) => ({
    ...q,
    options: (q.options || []).map((o) => ({ ...o })),
  }))
  const max = Math.min(excelQuestions.length, copy.length)
  for (let i = 0; i < max; i++) {
    const pq = excelQuestions[i]
    if (!pq || pq.question_type !== 'multiple_choice') continue
    const stem = String(pq.question_text || '').trim()
    const incOpts = Array.isArray(pq.options) ? pq.options : []
    const n = (copy[i].options || []).length
    const mergedOpts = []
    for (let j = 0; j < n; j++) {
      const base = copy[i].options[j] || { text: '', is_correct: false }
      const inc = incOpts[j]
      mergedOpts.push({
        ...base,
        text:
          inc?.text != null && String(inc.text).trim() !== ''
            ? String(inc.text).trim()
            : base.text || '',
        is_correct: !!inc?.is_correct,
      })
    }
    let correctCount = mergedOpts.filter((o) => o.is_correct).length
    if (correctCount !== 1) {
      const letter = String(pq.correct_answer || '').trim().toUpperCase().charAt(0)
      mergedOpts.forEach((o) => {
        o.is_correct = false
      })
      const ix = 'ABCD'.indexOf(letter)
      if (ix >= 0 && ix < mergedOpts.length) mergedOpts[ix].is_correct = true
    }
    const nextFile =
      pq.file_url != null && String(pq.file_url).trim() !== ''
        ? String(pq.file_url).trim()
        : copy[i].file_url
    const nextAudio =
      pq.youtube_url != null && String(pq.youtube_url).trim() !== ''
        ? String(pq.youtube_url).trim()
        : copy[i].youtube_url

    copy[i] = {
      ...copy[i],
      text: stem || copy[i].text,
      question_text: stem || copy[i].question_text,
      options: mergedOpts,
      points: Number(pq.points) > 0 ? Number(pq.points) : copy[i].points ?? 1,
      file_url: nextFile,
      youtube_url: nextAudio,
    }
  }
  return copy
}

/** Áp các dòng đã parse vào câu liên tiếp bắt đầu từ startIndexZero (0-based). */
export function applyBulkRowsToQuestions(questions, rows, startIndexZero) {
  const copy = questions.map((q) => ({ ...q }))
  rows.forEach((row, i) => {
    const idx = startIndexZero + i
    if (idx >= copy.length) return
    const target = copy[idx]
    const prevOpts = target.options || []
    const nTarget = prevOpts.length
    let mergedOpts
    if (row.options.length === nTarget) {
      mergedOpts = row.options.map((o, j) => ({
        ...prevOpts[j],
        text: o.text,
        is_correct: !!o.is_correct,
      }))
    } else if (nTarget === 4 && row.options.length === 3) {
      mergedOpts = [
        ...row.options.map((o, j) => ({
          ...prevOpts[j],
          text: o.text,
          is_correct: !!o.is_correct,
        })),
        { ...prevOpts[3], text: prevOpts[3]?.text || '', is_correct: false },
      ]
    } else {
      mergedOpts = row.options.map((o, j) => ({
        ...(prevOpts[j] || { text: '', is_correct: false }),
        text: o.text,
        is_correct: !!o.is_correct,
      }))
    }
    copy[idx] = {
      ...target,
      text: row.stem,
      question_text: row.stem,
      options: mergedOpts,
    }
  })
  return copy
}

export function buildToeicListeningSkeletonQuestions() {
  const rows = []
  for (let i = 0; i < TOEIC_FULL_QUESTIONS; i++) {
    const meta = getToeicListeningMeta(i)
    const nOpts = meta.choices
    let stem = ''
    if (meta.part === 3) {
      stem = meta.indexInGroup === 0
        ? `<p><strong>Đoạn hội thoại ${meta.groupIndex + 1}</strong> — Nghe và trả lời câu hỏi.</p>`
        : ''
    } else if (meta.part === 4) {
      stem = meta.indexInGroup === 0
        ? `<p><strong>Bài nói ${meta.groupIndex + 1}</strong> — Nghe và trả lời câu hỏi.</p>`
        : ''
    } else if (meta.part === 1) {
      stem = '<p>Xem ảnh và chọn phương án phù hợp nhất.</p>'
    }
    rows.push({
      text: stem,
      question_type: 'multiple_choice',
      points: 1,
      options: emptyMcqOptions(nOpts),
      correct_answer: '',
      file_url: '',
      youtube_url: '',
    })
  }
  return rows
}

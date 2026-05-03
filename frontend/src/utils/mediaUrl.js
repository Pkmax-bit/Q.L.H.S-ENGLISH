/** URL gốc API không có suffix /api — dùng ghép link file tĩnh /uploads/... */
export function getApiOrigin() {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
  return base.replace(/\/api\/?$/, '')
}

export function publicUploadUrl(relativePath) {
  if (!relativePath || typeof relativePath !== 'string') return ''
  if (relativePath.startsWith('http')) return relativePath
  return `${getApiOrigin()}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`
}

/**
 * Tên file / nhãn hiển thị từ URL (basename đường dẫn; YouTube → "YouTube · {id}").
 */
export function mediaFileNameFromUrl(url) {
  if (!url || typeof url !== 'string') return ''
  const t = url.trim()
  if (!t) return ''
  const ytId = extractYoutubeId(t)
  if (ytId) return `YouTube · ${ytId}`
  try {
    const pathOnly = t.split(/[?#]/)[0]
    const seg = pathOnly.split('/').filter(Boolean)
    const raw = seg[seg.length - 1] || ''
    const decoded = decodeURIComponent(raw)
    return decoded || t.slice(0, 64)
  } catch {
    return ''
  }
}

/** Trích video ID từ URL YouTube (watch, embed, shorts, youtu.be). */
export function extractYoutubeId(url) {
  if (!url || typeof url !== 'string') return null
  const u = url.trim()
  const shorts = u.match(/youtube\.com\/shorts\/([^&?\s/]+)/)
  if (shorts) return shorts[1]
  const match = u.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/)
  return match ? match[1] : null
}

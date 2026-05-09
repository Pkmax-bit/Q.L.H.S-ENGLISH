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
 * Tên file / nhãn hiển thị từ URL (basename đường dẫn; YouTube → "YouTube · {id}";
 * Drive → "Google Drive · {short_id}").
 */
export function mediaFileNameFromUrl(url) {
  if (!url || typeof url !== 'string') return ''
  const t = url.trim()
  if (!t) return ''
  const ytId = extractYoutubeId(t)
  if (ytId) return `YouTube · ${ytId}`
  const driveId = extractDriveFileIdShort(t)
  if (driveId) {
    const short = driveId.length > 14 ? `${driveId.slice(0, 8)}…${driveId.slice(-4)}` : driveId
    return `Google Drive · ${short}`
  }
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

/** Bóc fileId Drive — phiên bản nhỏ gọn, dùng nội bộ trong file này (tránh import vòng). */
function extractDriveFileIdShort(url) {
  try {
    const u = new URL(url)
    if (!/(^|\.)google\.com$/.test(u.hostname) && u.hostname !== 'drive.usercontent.google.com') return null
    const m = url.match(/\/(?:file\/)?d\/([A-Za-z0-9_-]{10,})/)
    if (m) return m[1]
    const id = u.searchParams.get('id')
    if (id && /^[A-Za-z0-9_-]{10,}$/.test(id)) return id
  } catch {}
  return null
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

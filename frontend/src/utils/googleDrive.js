/**
 * Tiện ích nhận diện & chuyển link Google Drive sang URL có thể dùng trực tiếp
 * trong thẻ <img> / <audio> / <video> hoặc qua backend proxy.
 *
 * Hỗ trợ các format Drive thường gặp:
 *   - https://drive.google.com/file/d/{ID}/view?usp=sharing
 *   - https://drive.google.com/file/d/{ID}/preview
 *   - https://drive.google.com/open?id={ID}
 *   - https://drive.google.com/uc?id={ID}&export=download
 *   - https://drive.google.com/uc?export=download&id={ID}
 *   - https://docs.google.com/uc?export=download&id={ID}
 *   - https://drive.google.com/thumbnail?id={ID}
 *   - https://drive.usercontent.google.com/download?id={ID}
 */

import { getApiOrigin } from './mediaUrl'

const DRIVE_HOSTS = new Set([
  'drive.google.com',
  'docs.google.com',
  'drive.usercontent.google.com',
])

/** Có phải URL Google Drive? */
export function isGoogleDriveUrl(url) {
  if (!url || typeof url !== 'string') return false
  try {
    const u = new URL(url.trim())
    return DRIVE_HOSTS.has(u.hostname)
  } catch {
    return false
  }
}

/** Bóc fileId từ link Drive — trả về null nếu không nhận diện được. */
export function extractDriveFileId(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!isGoogleDriveUrl(trimmed)) return null

  // /file/d/{id}/view  |  /file/d/{id}/preview  |  /d/{id}/...
  const mFileD = trimmed.match(/\/(?:file\/)?d\/([A-Za-z0-9_-]{10,})/)
  if (mFileD) return mFileD[1]

  // ?id={id} hoặc &id={id}
  try {
    const u = new URL(trimmed)
    const idParam = u.searchParams.get('id')
    if (idParam && /^[A-Za-z0-9_-]{10,}$/.test(idParam)) return idParam
  } catch {}

  return null
}

/**
 * URL ảnh thumbnail Drive — dùng được trên <img>. Width tối đa Drive cho phép ~2000.
 * @param {string} fileId
 * @param {number} width — bề rộng yêu cầu (mặc định 1600)
 */
export function toDriveThumbnailUrl(fileId, width = 1600) {
  if (!fileId) return ''
  const w = Math.max(64, Math.min(2400, Math.floor(width)))
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${w}`
}

/**
 * URL backend proxy stream file Drive — dùng cho audio / video / file binary.
 * Hỗ trợ Range requests (audio seek).
 */
export function toDriveProxyUrl(fileId) {
  if (!fileId) return ''
  return `${getApiOrigin()}/api/drive-proxy?id=${encodeURIComponent(fileId)}`
}

/**
 * Chuyển một URL bất kỳ sang dạng có thể render trực tiếp theo loại media.
 * - kind = 'image': Drive → thumbnail; URL khác → giữ nguyên.
 * - kind = 'audio' | 'video' | 'file': Drive → backend proxy; URL khác → giữ nguyên.
 * - kind = 'auto' (mặc định): tự đoán theo phần mở rộng của URL gốc; Drive luôn đi proxy.
 *
 * Mọi URL không phải Drive được trả về nguyên (kể cả YouTube — vẫn dùng iframe ở chỗ render).
 */
export function normalizeMediaUrl(url, kind = 'auto') {
  if (!url || typeof url !== 'string') return ''
  const raw = url.trim()
  if (!raw) return ''

  if (!isGoogleDriveUrl(raw)) return raw

  const fileId = extractDriveFileId(raw)
  if (!fileId) return raw

  if (kind === 'image') return toDriveThumbnailUrl(fileId)
  if (kind === 'audio' || kind === 'video' || kind === 'file') return toDriveProxyUrl(fileId)

  // auto — đoán theo URL gốc (rất hạn chế cho Drive vì link không có ext)
  return toDriveProxyUrl(fileId)
}

/** Nhãn ngắn gọn cho link Drive (vd: "Google Drive · ABC123…"). */
export function driveLabel(url) {
  const id = extractDriveFileId(url)
  if (!id) return null
  const short = id.length > 14 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id
  return `Google Drive · ${short}`
}

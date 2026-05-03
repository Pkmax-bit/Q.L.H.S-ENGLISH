/**
 * Axios: res.data thường là { success, message, data }.
 * Chỉ bóc lớp envelope khi có success: true; tránh lấy nhầm trường `data` của bản thân resource.
 */
export function unwrapApiPayload(res) {
  if (!res) return null
  const body = res.data
  if (body == null) return null
  if (typeof body !== 'object') return body
  if (body.success === true && Object.prototype.hasOwnProperty.call(body, 'data')) {
    return body.data
  }
  return body
}

/** JSONB options đôi khi là string — luôn trả về mảng cho UI */
export function normalizeMcqOptions(raw) {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw)
      return Array.isArray(p) ? p : []
    } catch {
      return []
    }
  }
  return []
}

/** Nhãn A, B, C, … cho đáp án trắc nghiệm (0 → A). */
export function mcqLetter(index) {
  if (typeof index !== 'number' || index < 0) return '?'
  if (index < 26) return String.fromCharCode(65 + index)
  return String(index + 1)
}

export const MCQ_OPTION_COUNT_MIN = 2
export const MCQ_OPTION_COUNT_MAX = 6

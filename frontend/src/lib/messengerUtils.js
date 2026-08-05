const GRADIENTS = [
  'linear-gradient(135deg, #2563EB, #7C3AED)',
  'linear-gradient(135deg, #0ea5e9, #0891b2)',
  'linear-gradient(135deg, #8b5cf6, #6366f1)',
  'linear-gradient(135deg, #22c55e, #16a34a)',
  'linear-gradient(135deg, #f59e0b, #ea580c)',
  'linear-gradient(135deg, #f43f5e, #ec4899)',
  'linear-gradient(135deg, #d0a331, #b18734)',
]

export function bubbleGradient(name) {
  const s = String(name || '?')
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return GRADIENTS[h % GRADIENTS.length]
}

export function initials(name, max = 2) {
  if (!name) return '?'
  const parts = String(name).trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, max).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).slice(0, max).toUpperCase()
}

export function formatPreviewTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = (Date.now() - d) / 1000
  if (diff < 60) return 'Vừa xong'
  if (diff < 3600) return `${Math.floor(diff / 60)}p`
  if (diff < 86400) return `${Math.floor(diff / 3600)}g`
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

export const PINNED_GROUPS_KEY = 'qlhs_messenger_pinned_groups'

export function loadPinnedGroups(uid) {
  try {
    const raw = localStorage.getItem(`${PINNED_GROUPS_KEY}:${uid || 'guest'}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function savePinnedGroups(uid, ids) {
  try {
    localStorage.setItem(`${PINNED_GROUPS_KEY}:${uid || 'guest'}`, JSON.stringify(ids))
  } catch { /* ignore */ }
}

const ROLE_LABELS = {
  admin: 'Quản trị viên',
  teacher: 'Giáo viên',
  student: 'Học sinh',
}

export function roleLabel(role) {
  return ROLE_LABELS[role] || role || ''
}

export function contactSubtitle(contact) {
  const role = roleLabel(contact?.role)
  const classes = (contact?.class_names || []).filter(Boolean)
  if (classes.length) return `${role} · ${classes.slice(0, 2).join(', ')}${classes.length > 2 ? '…' : ''}`
  return role
}

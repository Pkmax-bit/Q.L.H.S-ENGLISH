import { roleLabel } from './messengerUtils'

export const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:3001'

export function mediaUrl(path) {
  if (!path) return null
  if (String(path).startsWith('http')) return path
  return `${API_BASE}${path}`
}

export function timeAgo(iso) {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'Vừa xong'
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`
  if (s < 604800) return `${Math.floor(s / 86400)} ngày trước`
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function profileRoleLabel(role) {
  return roleLabel(role)
}

export function initials(name, max = 2) {
  if (!name) return '?'
  const parts = String(name).trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, max).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).slice(0, max).toUpperCase()
}

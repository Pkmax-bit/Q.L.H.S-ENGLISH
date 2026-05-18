// Convert a server-side relative upload path (e.g. "/uploads/foo.png")
// into an absolute URL using VITE_API_URL (which ends in /api).
export function resolveUploadUrl(pathOrUrl) {
  if (!pathOrUrl) return ''
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
  // Strip trailing /api to get server origin
  const origin = apiBase.replace(/\/api\/?$/, '')
  if (pathOrUrl.startsWith('/')) return origin + pathOrUrl
  return origin + '/' + pathOrUrl
}

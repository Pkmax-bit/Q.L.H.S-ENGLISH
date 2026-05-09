import { useState } from 'react'
import { CheckCircle2, AlertTriangle, Loader2, Cloud } from 'lucide-react'
import api from '../../services/api'
import {
  isGoogleDriveUrl,
  extractDriveFileId,
  normalizeMediaUrl,
} from '../../utils/googleDrive'

/**
 * Hiển thị badge "Google Drive" + nút "Kiểm tra link" cho input URL.
 * - Nhận diện URL Drive ngay khi user nhập.
 * - Nút "Kiểm tra" gọi /api/drive-proxy/check để xác nhận file đã share công khai.
 * - Hiện thông tin Content-Type và size khi kiểm tra thành công.
 *
 * Dùng đặt ngay dưới ô <Input value={url} … />.
 *
 * Props:
 *   - url: string — URL hiện tại (để hiển thị badge / extract fileId).
 *   - kind: 'image' | 'audio' | 'video' | 'file' — loại media (gợi ý hiển thị).
 *   - className?: string
 */
export default function DriveLinkHelper({ url, kind = 'auto', className = '' }) {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  if (!url || !url.trim()) return null
  const isDrive = isGoogleDriveUrl(url)
  if (!isDrive) return null

  const fileId = extractDriveFileId(url)
  if (!fileId) {
    return (
      <p className={`text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1 inline-flex items-center gap-1 ${className}`}>
        <AlertTriangle className="h-3.5 w-3.5" />
        Không nhận diện được fileId trong link Drive này.
      </p>
    )
  }

  const handleCheck = async () => {
    setChecking(true)
    setError(null)
    setResult(null)
    try {
      const res = await api.get('/drive-proxy/check', { params: { id: fileId } })
      setResult(res.data?.data ?? res.data)
    } catch (err) {
      const msg = err.response?.data?.message || 'Không kiểm tra được link Drive'
      setError(msg)
    } finally {
      setChecking(false)
    }
  }

  const proxyHref = normalizeMediaUrl(url, kind === 'image' ? 'image' : 'audio')

  return (
    <div className={`mt-1 flex flex-wrap items-center gap-2 text-xs ${className}`}>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
        <Cloud className="h-3 w-3" /> Google Drive · {fileId.slice(0, 8)}…{fileId.slice(-4)}
      </span>

      <button
        type="button"
        onClick={handleCheck}
        disabled={checking}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium disabled:opacity-60"
      >
        {checking ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        {checking ? 'Đang kiểm tra…' : 'Kiểm tra link'}
      </button>

      <a
        href={proxyHref}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        Mở thử (qua proxy)
      </a>

      {result?.ok && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
          <CheckCircle2 className="h-3 w-3" />
          OK · {result.content_type || 'unknown'}
          {result.size_bytes ? ` · ${formatBytes(result.size_bytes)}` : ''}
        </span>
      )}

      {error && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-medium">
          <AlertTriangle className="h-3 w-3" /> {error}
        </span>
      )}
    </div>
  )
}

function formatBytes(n) {
  if (!n || n < 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

import { useRef, useState } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import UserAvatar from './UserAvatar'
import Input from './Input'
import socialService from '../../services/social.service'

export default function AvatarPicker({ value, name, fullName, onChange, disabled = false }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file ảnh')
      return
    }
    setError(null)
    setUploading(true)
    try {
      const { url } = await socialService.uploadImage(file)
      onChange(url)
    } catch {
      setError('Không tải được ảnh')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <span className="block text-sm font-medium text-gray-700">Ảnh đại diện</span>
      <div className="flex items-center gap-4">
        <div className="relative">
          <UserAvatar name={fullName} avatarUrl={value} size="xl" />
          {!disabled && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-amber-600 text-white shadow-md hover:bg-amber-700 disabled:opacity-60"
              title="Chọn ảnh"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
          )}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <Input
            label="Hoặc dán URL ảnh"
            name={name}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://... hoặc /uploads/..."
            disabled={disabled}
          />
          {value && !disabled && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800"
            >
              <X className="h-3 w-3" />
              Xóa ảnh
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}

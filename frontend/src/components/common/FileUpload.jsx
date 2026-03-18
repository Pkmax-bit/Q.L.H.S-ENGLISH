import { useState, useRef } from 'react'
import { Upload, X, FileText, Image } from 'lucide-react'
import clsx from 'clsx'

export default function FileUpload({ onFileSelect, accept, multiple = false, maxSize = 5, label }) {
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState([])
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const maxBytes = maxSize * 1024 * 1024

  const handleFiles = (fileList) => {
    setError(null)
    const newFiles = Array.from(fileList)

    for (const file of newFiles) {
      if (file.size > maxBytes) {
        setError(`File "${file.name}" vượt quá ${maxSize}MB`)
        return
      }
    }

    const updated = multiple ? [...files, ...newFiles] : newFiles
    setFiles(updated)
    onFileSelect?.(multiple ? updated : updated[0])
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files.length) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const removeFile = (index) => {
    const updated = files.filter((_, i) => i !== index)
    setFiles(updated)
    onFileSelect?.(multiple ? updated : updated[0] || null)
  }

  const isImage = (file) => file.type.startsWith('image/')

  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          'relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
          dragActive
            ? 'border-primary-400 bg-primary-50'
            : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">
          Kéo thả file vào đây hoặc <span className="text-primary-500 font-medium">chọn file</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">Tối đa {maxSize}MB</p>
      </div>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                {isImage(file) ? (
                  <Image className="h-5 w-5 text-blue-500" />
                ) : (
                  <FileText className="h-5 w-5 text-gray-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile(index)
                }}
                className="p-1 rounded-full hover:bg-gray-200 text-gray-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ size = 'md', message = 'Đang tải...' }) {
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary-500`} />
      {message && <p className="mt-3 text-sm text-gray-500">{message}</p>}
    </div>
  )
}

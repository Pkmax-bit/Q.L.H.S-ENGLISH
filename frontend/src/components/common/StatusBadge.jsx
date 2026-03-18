import clsx from 'clsx'

const statusStyles = {
  active: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', label: 'Hoạt động' },
  inactive: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', label: 'Ngừng' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500', label: 'Chờ duyệt' },
  completed: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Hoàn thành' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'Đã hủy' },
  income: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', label: 'Thu' },
  expense: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'Chi' },
  open: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', label: 'Mở' },
  closed: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', label: 'Đóng' },
}

export default function StatusBadge({ status, label, className = '' }) {
  const style = statusStyles[status] || statusStyles.active
  const displayLabel = label || style.label

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
        style.bg,
        style.text,
        className
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full', style.dot)} />
      {displayLabel}
    </span>
  )
}

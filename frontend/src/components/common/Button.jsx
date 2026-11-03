import clsx from 'clsx'
import { Loader2 } from 'lucide-react'

const variants = {
  primary:
    'bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-900/10',
  secondary:
    'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80',
  danger: 'bg-red-500 hover:bg-red-600 text-white shadow-sm',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
  warning: 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm',
  outline:
    'border border-slate-200 hover:bg-primary-50/60 hover:border-primary-200 text-slate-700 bg-white/80',
  ghost: 'hover:bg-primary-50/80 text-slate-700',
}

const sizes = {
  // Cỡ cho thanh công cụ nhiều nút. Đệm dọc rộng hơn trên điện thoại rồi mới
  // bóp lại từ 640px: ở đây nút chỉ còn mỗi icon, để py-1 là cao 24px — nhỏ
  // hơn đầu ngón tay, bấm hay trượt sang nút bên cạnh.
  xs: 'px-2 py-2 text-xs gap-1.5 sm:py-1',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : Icon ? (
        <Icon className="h-4 w-4" />
      ) : null}
      {children}
    </button>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Play, BookOpenCheck } from 'lucide-react'
import clsx from 'clsx'
import { useTourOptional } from '../../context/TourContext'
import { useAuth } from '../../hooks/useAuth'
import { getPageTourActions } from '../../tours/tourDefinitions'

/**
 * Nút ? cạnh tiêu đề trang — luôn hiện khi có thể chạy tour / mở guide.
 */
export default function PageTourButton({ variant = 'title', className = '' }) {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const tour = useTourOptional()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const role = user?.role || user?.roles?.[0]

  const actions = useMemo(
    () => getPageTourActions(pathname, search, role),
    [pathname, search, role]
  )

  useEffect(() => {
    setOpen(false)
  }, [pathname, search])

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  if (pathname === '/guide') return null
  // Chỉ ẩn khi overlay tour đang hiện
  if (tour?.active && tour?.step) return null

  const primary = actions.items[0]
  const hasMany = actions.items.length > 1
  const isTitle = variant === 'title'

  const run = (item) => {
    setOpen(false)
    if (tour?.startTour) {
      tour.startTour(item.tourId, {
        startAt: item.startAt ?? 0,
        stayOnPage: true,
      })
    } else {
      navigate('/guide')
    }
  }

  const goGuide = () => {
    setOpen(false)
    navigate('/guide')
  }

  const helpBtnClass = isTitle
    ? 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-500 text-[14px] font-bold leading-none text-white shadow-sm transition-all hover:bg-amber-600 hover:border-amber-500'
    : 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-500 text-sm font-bold leading-none text-white shadow-sm transition-colors hover:bg-amber-600'

  // Không có tour context / không có item → vẫn hiện nút mở trang hướng dẫn
  if (!primary) {
    return (
      <button
        type="button"
        onClick={goGuide}
        className={clsx(helpBtnClass, className)}
        title="Hướng dẫn thao tác"
        aria-label="Hướng dẫn"
      >
        ?
      </button>
    )
  }

  return (
    <div className={clsx('relative inline-flex items-center', className)} ref={ref}>
      <button
        type="button"
        onClick={() => (hasMany ? setOpen((v) => !v) : run(primary))}
        className={helpBtnClass}
        title={primary.label}
        aria-label={primary.label}
        aria-expanded={hasMany ? open : undefined}
        aria-haspopup={hasMany ? 'menu' : undefined}
      >
        ?
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1.5 w-56 rounded-lg border border-stone-200 bg-white py-1 shadow-lg z-50 overflow-hidden"
        >
          <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400 border-b border-stone-100">
            Hướng dẫn trang này
          </p>
          {actions.items.map((item) => (
            <button
              key={item.tourId + item.label}
              type="button"
              role="menuitem"
              onClick={() => run(item)}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-left text-xs text-stone-800 hover:bg-amber-50"
            >
              <Play className="h-3 w-3 text-amber-600 fill-amber-600 shrink-0" />
              <span>{item.label}</span>
            </button>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={goGuide}
            className="w-full flex items-center gap-2 px-2.5 py-2 text-left text-xs text-stone-600 hover:bg-stone-50 border-t border-stone-100"
          >
            <BookOpenCheck className="h-3 w-3 shrink-0" />
            Tất cả hướng dẫn
          </button>
        </div>
      )}
    </div>
  )
}

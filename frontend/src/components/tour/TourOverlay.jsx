import { useMemo } from 'react'
import { X, ChevronLeft, ChevronRight, MousePointerClick, Eye, SkipForward } from 'lucide-react'
import clsx from 'clsx'

function tooltipPosition(rect, placement, tooltipW = 360, tooltipH = 280) {
  const gap = 14
  const vw = window.innerWidth
  const vh = window.innerHeight
  let top = 24
  let left = Math.max(16, (vw - tooltipW) / 2)

  if (!rect) {
    return { top: Math.max(24, vh / 2 - tooltipH / 2), left }
  }

  const place = placement || 'bottom'

  if (place === 'right') {
    top = Math.min(Math.max(16, rect.top), vh - tooltipH - 16)
    left = Math.min(rect.left + rect.width + gap, vw - tooltipW - 16)
  } else if (place === 'left') {
    top = Math.min(Math.max(16, rect.top), vh - tooltipH - 16)
    left = Math.max(16, rect.left - tooltipW - gap)
  } else if (place === 'top') {
    top = Math.max(16, rect.top - tooltipH - gap)
    left = Math.min(Math.max(16, rect.left + rect.width / 2 - tooltipW / 2), vw - tooltipW - 16)
  } else {
    top = Math.min(rect.top + rect.height + gap, vh - tooltipH - 16)
    left = Math.min(Math.max(16, rect.left + rect.width / 2 - tooltipW / 2), vw - tooltipW - 16)
  }

  return { top, left }
}

export default function TourOverlay({
  tour,
  step,
  stepIndex,
  isLast,
  status,
  rect,
  onNext,
  onPrev,
  onClose,
}) {
  const pos = useMemo(
    () => tooltipPosition(rect, step.placement),
    [rect, step.placement]
  )

  const holeStyle = rect
    ? {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }
    : null

  const needClick = step.advanceOn === 'click' && status === 'ready'

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none" aria-live="polite">
      {holeStyle ? (
        <>
          <div className="absolute inset-0 pointer-events-auto" aria-hidden>
            <div className="absolute bg-black/55" style={{ top: 0, left: 0, right: 0, height: Math.max(0, holeStyle.top) }} />
            <div
              className="absolute bg-black/55"
              style={{
                top: holeStyle.top + holeStyle.height,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
            <div
              className="absolute bg-black/55"
              style={{
                top: holeStyle.top,
                left: 0,
                width: Math.max(0, holeStyle.left),
                height: holeStyle.height,
              }}
            />
            <div
              className="absolute bg-black/55"
              style={{
                top: holeStyle.top,
                left: holeStyle.left + holeStyle.width,
                right: 0,
                height: holeStyle.height,
              }}
            />
          </div>
          <div
            className="absolute rounded-xl ring-4 ring-amber-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.01)] pointer-events-none animate-pulse"
            style={holeStyle}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/50 pointer-events-auto" />
      )}

      <div
        className="absolute w-[min(100%-1.5rem,22.5rem)] max-h-[min(70vh,28rem)] overflow-y-auto pointer-events-auto rounded-2xl border border-amber-200 bg-white shadow-2xl shadow-black/30"
        style={{ top: pos.top, left: pos.left }}
        role="dialog"
        aria-label={tour.title}
      >
        <div className="flex items-start justify-between gap-2 px-4 pt-3 pb-1 sticky top-0 bg-white z-10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              {tour.title} · Bước {stepIndex + 1}/{tour.steps.length}
            </p>
            <h3 className="text-base font-semibold text-stone-900 mt-0.5 leading-snug">{step.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 shrink-0"
            aria-label="Đóng tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 pb-3 space-y-2.5">
          <p className="text-sm text-stone-800 flex gap-2">
            <MousePointerClick className="h-4 w-4 shrink-0 text-primary-600 mt-0.5" />
            <span>
              <span className="font-semibold text-primary-800">Làm gì: </span>
              {step.body}
            </span>
          </p>

          {step.fill && (
            <p className="text-xs text-indigo-900 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-2">
              <span className="font-semibold">Điền mẫu: </span>
              {step.fill}
            </p>
          )}

          {step.appear && (
            <p className="text-xs text-emerald-900 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-2 flex gap-2">
              <Eye className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                <strong className="font-semibold">Sẽ hiện / đang thấy: </strong>
                {step.appear}
              </span>
            </p>
          )}

          {Array.isArray(step.hints) && step.hints.length > 0 && (
            <ul className="text-xs text-stone-600 space-y-1 pl-1 border-l-2 border-amber-200 ml-0.5">
              {step.hints.map((h) => (
                <li key={h} className="pl-2 leading-relaxed">
                  • {h}
                </li>
              ))}
            </ul>
          )}

          {status === 'locating' && (
            <p className="text-xs text-stone-500">Đang tìm chỗ cần bấm trên màn hình…</p>
          )}
          {(status === 'missing' || status === 'missing-optional') && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
              {status === 'missing-optional'
                ? 'Chưa thấy nút này (có thể bạn chưa mở lớp / chưa đủ quyền). Bấm Bỏ qua để tiếp tục.'
                : 'Không tìm thấy vị trí cần bấm. Mở đúng trang rồi bấm Tiếp, hoặc Đóng tour và bắt đầu lại.'}
            </p>
          )}

          {needClick && (
            <p className="text-xs font-semibold text-primary-700 bg-primary-50 rounded-lg px-2.5 py-1.5">
              → Bấm đúng chỗ đang sáng (viền vàng) để sang bước tiếp.
            </p>
          )}
          {step.advanceOn === 'next' && status === 'ready' && (
            <p className="text-xs font-medium text-stone-600">
              → Điền / chọn xong ô đang sáng, rồi bấm <strong>Tiếp</strong> bên dưới.
            </p>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-2 px-4 py-3 border-t border-stone-100 bg-stone-50/95 rounded-b-2xl">
          <button
            type="button"
            onClick={onPrev}
            disabled={stepIndex === 0}
            className={clsx(
              'inline-flex items-center gap-1 text-sm font-medium px-2 py-1.5 rounded-lg',
              stepIndex === 0 ? 'text-stone-300' : 'text-stone-600 hover:bg-white'
            )}
          >
            <ChevronLeft className="h-4 w-4" /> Trước
          </button>

          <div className="flex items-center gap-1.5">
            {(status === 'missing-optional' || (status === 'missing' && step.optional)) && (
              <button
                type="button"
                onClick={onNext}
                className="inline-flex items-center gap-1 text-sm font-medium px-2.5 py-1.5 rounded-lg text-amber-800 hover:bg-amber-100"
              >
                <SkipForward className="h-4 w-4" /> Bỏ qua
              </button>
            )}
            {(step.advanceOn === 'next' || status === 'missing' || status === 'missing-optional') && (
              <button
                type="button"
                onClick={onNext}
                className="inline-flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700"
              >
                {isLast ? 'Xong' : 'Tiếp'}
                {!isLast && <ChevronRight className="h-4 w-4" />}
              </button>
            )}
            {needClick && !isLast && (
              <button
                type="button"
                onClick={onNext}
                className="text-xs text-stone-500 underline px-1"
              >
                Bỏ qua
              </button>
            )}
            {needClick && isLast && (
              <button
                type="button"
                onClick={onNext}
                className="inline-flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700"
              >
                Xong
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

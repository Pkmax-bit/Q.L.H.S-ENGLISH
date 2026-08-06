import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react'
import clsx from 'clsx'

const EDGE = 10
const GAP = 10
const PANEL_W = 268

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max)
}

function computePanelBox(rect, placement, panelW, panelH, vw, vh) {
  const maxW = Math.min(panelW || PANEL_W, vw - EDGE * 2)
  const maxH = Math.min(panelH || 220, Math.min(vh * 0.42, 280))
  const narrow = vw < 640

  if (narrow || !rect) {
    const h = Math.min(maxH, vh * 0.38)
    return {
      top: clamp(vh - h - EDGE, EDGE, vh - EDGE),
      left: EDGE,
      width: Math.min(vw - EDGE * 2, 320),
      maxHeight: h,
      docked: true,
    }
  }

  const prefer = placement || 'bottom'
  const space = {
    top: rect.top - EDGE,
    bottom: vh - rect.bottom - EDGE,
    left: rect.left - EDGE,
    right: vw - rect.right - EDGE,
  }

  const order =
    prefer === 'right'
      ? ['right', 'left', 'bottom', 'top']
      : prefer === 'left'
        ? ['left', 'right', 'bottom', 'top']
        : prefer === 'top'
          ? ['top', 'bottom', 'right', 'left']
          : ['bottom', 'top', 'right', 'left']

  let chosen = order[0]
  for (const side of order) {
    const need = side === 'left' || side === 'right' ? maxW + GAP : maxH + GAP
    if (space[side] >= need * 0.5) {
      chosen = side
      break
    }
  }

  const bestSpace = Math.max(space.top, space.bottom, space.left, space.right)
  if (bestSpace < 120) {
    const h = Math.min(maxH, vh * 0.36)
    return {
      top: clamp(vh - h - EDGE, EDGE, vh - EDGE),
      left: EDGE,
      width: Math.min(vw - EDGE * 2, 320),
      maxHeight: h,
      docked: true,
    }
  }

  let top
  let left
  let availH = maxH

  if (chosen === 'bottom') {
    top = rect.bottom + GAP
    left = rect.left + rect.width / 2 - maxW / 2
    availH = Math.min(maxH, vh - top - EDGE)
  } else if (chosen === 'top') {
    availH = Math.min(maxH, rect.top - GAP - EDGE)
    top = rect.top - GAP - availH
    left = rect.left + rect.width / 2 - maxW / 2
  } else if (chosen === 'right') {
    left = rect.right + GAP
    top = rect.top
    availH = Math.min(maxH, vh - EDGE - top)
  } else {
    left = rect.left - GAP - maxW
    top = rect.top
    availH = Math.min(maxH, vh - EDGE - top)
  }

  left = clamp(left, EDGE, vw - maxW - EDGE)
  top = clamp(top, EDGE, vh - Math.min(availH, maxH) - EDGE)

  return {
    top,
    left,
    width: maxW,
    maxHeight: Math.max(120, availH),
    docked: false,
  }
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
  const panelRef = useRef(null)
  const [box, setBox] = useState(() =>
    computePanelBox(rect, step.placement, PANEL_W, 200, window.innerWidth, window.innerHeight)
  )

  useLayoutEffect(() => {
    const update = () => {
      const el = panelRef.current
      const vw = window.innerWidth
      const vh = window.innerHeight
      const measuredW = el?.offsetWidth || Math.min(PANEL_W, vw - EDGE * 2)
      const measuredH = el?.scrollHeight || 200
      setBox(computePanelBox(rect, step.placement, measuredW, measuredH, vw, vh))
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [rect, step.placement, stepIndex, status, step.title])

  const holeStyle = useMemo(
    () =>
      rect
        ? {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }
        : null,
    [rect]
  )

  const needClick = step.advanceOn === 'click' && status === 'ready'
  const showNext =
    step.advanceOn === 'next' || status === 'missing' || status === 'missing-optional'

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none" aria-live="polite">
      {holeStyle ? (
        <>
          <div
            className="absolute bg-black/50 pointer-events-auto"
            style={{ top: 0, left: 0, right: 0, height: Math.max(0, holeStyle.top) }}
            aria-hidden
          />
          <div
            className="absolute bg-black/50 pointer-events-auto"
            style={{
              top: holeStyle.top + holeStyle.height,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            aria-hidden
          />
          <div
            className="absolute bg-black/50 pointer-events-auto"
            style={{
              top: holeStyle.top,
              left: 0,
              width: Math.max(0, holeStyle.left),
              height: holeStyle.height,
            }}
            aria-hidden
          />
          <div
            className="absolute bg-black/50 pointer-events-auto"
            style={{
              top: holeStyle.top,
              left: holeStyle.left + holeStyle.width,
              right: 0,
              height: holeStyle.height,
            }}
            aria-hidden
          />
          <div
            className="absolute rounded-lg ring-2 ring-amber-400 pointer-events-none"
            style={holeStyle}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/45 pointer-events-auto" />
      )}

      <div
        ref={panelRef}
        className={clsx(
          'fixed pointer-events-auto overflow-y-auto overscroll-contain border border-amber-200/90 bg-white shadow-lg',
          box.docked ? 'rounded-t-xl rounded-b-lg' : 'rounded-xl'
        )}
        style={{
          top: box.top,
          left: box.left,
          width: box.width,
          maxHeight: box.maxHeight,
          maxWidth: `calc(100vw - ${EDGE * 2}px)`,
        }}
        role="dialog"
        aria-label={tour.title}
      >
        <div className="flex items-center justify-between gap-1.5 px-2.5 pt-2 pb-1 sticky top-0 bg-white z-10 border-b border-stone-100/80">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-amber-700/90 truncate leading-none">
              {stepIndex + 1}/{tour.steps.length} · {tour.title.replace(/^Tour:\s*/i, '')}
            </p>
            <h3 className="text-[13px] font-semibold text-stone-900 mt-0.5 leading-tight truncate">
              {step.title.replace(/^Bước \d+\s*[—–-]\s*/, '')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-0.5 rounded text-stone-400 hover:bg-stone-100 hover:text-stone-700 shrink-0"
            aria-label="Đóng tour"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="px-2.5 py-1.5 space-y-1.5">
          <p className="text-[12px] text-stone-700 leading-snug">{step.body}</p>

          {step.fill && (
            <p className="text-[11px] text-indigo-800 bg-indigo-50/90 rounded px-1.5 py-1 leading-snug">
              <span className="font-semibold">VD:</span> {step.fill.replace(/^Ví dụ:\s*/i, '')}
            </p>
          )}

          {needClick && (
            <p className="text-[10px] font-medium text-primary-700">Bấm chỗ viền vàng →</p>
          )}
          {step.advanceOn === 'next' && status === 'ready' && (
            <p className="text-[10px] text-stone-500">Điền xong → Tiếp</p>
          )}

          {status === 'locating' && (
            <p className="text-[10px] text-stone-400">Đang tìm…</p>
          )}
          {(status === 'missing' || status === 'missing-optional') && (
            <p className="text-[10px] text-amber-800 bg-amber-50 rounded px-1.5 py-1 leading-snug">
              {status === 'missing-optional'
                ? 'Chưa thấy — bấm Bỏ qua.'
                : 'Không tìm thấy — mở đúng trang hoặc Tiếp.'}
            </p>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-1 px-2 py-1.5 border-t border-stone-100 bg-stone-50/95">
          <button
            type="button"
            onClick={onPrev}
            disabled={stepIndex === 0}
            className={clsx(
              'inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-1 rounded',
              stepIndex === 0 ? 'text-stone-300' : 'text-stone-600 hover:bg-white'
            )}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Trước
          </button>

          <div className="flex items-center gap-1">
            {(status === 'missing-optional' || (status === 'missing' && step.optional) || needClick) &&
              !isLast && (
                <button
                  type="button"
                  onClick={onNext}
                  className="inline-flex items-center gap-0.5 text-[11px] text-stone-500 hover:text-amber-800 px-1"
                >
                  <SkipForward className="h-3 w-3" />
                  Bỏ qua
                </button>
              )}
            {(showNext || (needClick && isLast)) && (
              <button
                type="button"
                onClick={onNext}
                className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
              >
                {isLast ? 'Xong' : 'Tiếp'}
                {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

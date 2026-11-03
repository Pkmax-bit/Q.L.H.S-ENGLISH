import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TOURS } from '../tours/tourDefinitions'
import TourOverlay from '../components/tour/TourOverlay'

const TourContext = createContext(null)

const PAD = 8
const POLL_MS = 120
const MAX_WAIT_MS = 12000

function queryTarget(selector) {
  if (!selector) return null
  try {
    const nodes = document.querySelectorAll(selector)
    if (!nodes.length) return null
    // Ưu tiên phần tử đang hiện trên viewport (sidebar desktop vs drawer mobile trùng data-tour)
    for (const el of nodes) {
      const r = el.getBoundingClientRect()
      const visible =
        r.width >= 2 &&
        r.height >= 2 &&
        r.bottom > 0 &&
        r.right > 0 &&
        r.top < window.innerHeight &&
        r.left < window.innerWidth
      if (visible) return el
    }
    return nodes[nodes.length - 1]
  } catch {
    return null
  }
}

function rectOf(el) {
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width < 2 && r.height < 2) return null
  return {
    top: r.top - PAD,
    left: r.left - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
    bottom: r.bottom + PAD,
    right: r.right + PAD,
  }
}

function ensureNavVisible(selector) {
  let el = queryTarget(selector)
  const offscreen =
    !el ||
    el.getBoundingClientRect().width < 2 ||
    el.getBoundingClientRect().right <= 0 ||
    el.getBoundingClientRect().left >= window.innerWidth

  if (offscreen && window.innerWidth < 1024) {
    document.querySelector('[data-tour="mobile-menu"]')?.click()
  }

  el = queryTarget(selector)
  if (!el) return

  // Mở section sidebar nếu đang đóng (nút aria-expanded ngay trước nhóm item)
  const group = el.parentElement
  const sectionBtn = group?.previousElementSibling
  if (sectionBtn?.getAttribute?.('aria-expanded') === 'false') {
    sectionBtn.click()
  }
}

export function TourProvider({ children }) {
  const navigate = useNavigate()
  const [tourId, setTourId] = useState(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState(null)
  const [status, setStatus] = useState('idle') // idle | locating | ready | missing
  const pollRef = useRef(null)
  const startedAt = useRef(0)

  const tour = tourId ? TOURS[tourId] : null
  const step = tour?.steps?.[stepIndex] ?? null
  const isLast = tour ? stepIndex >= tour.steps.length - 1 : false

  // Tour kẹt (id sai / step lệch sau HMR) → tự tắt để nút ? hiện lại
  useEffect(() => {
    if (tourId && !step) {
      setTourId(null)
      setStepIndex(0)
      setRect(null)
      setStatus('idle')
    }
  }, [tourId, step])

  const clearPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const endTour = useCallback(() => {
    clearPoll()
    setTourId(null)
    setStepIndex(0)
    setRect(null)
    setStatus('idle')
  }, [])

  const locate = useCallback((currentStep) => {
    clearPoll()
    if (!currentStep) return
    setStatus('locating')
    setRect(null)
    startedAt.current = Date.now()

    const tick = () => {
      if (currentStep.selector?.startsWith('[data-tour="nav-')) {
        ensureNavVisible(currentStep.selector)
      }
      const el = queryTarget(currentStep.selector)
      const r = rectOf(el)
      if (el && r) {
        el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
        setRect(rectOf(el))
        setStatus('ready')
        clearPoll()
        return
      }
      if (Date.now() - startedAt.current > MAX_WAIT_MS) {
        setStatus(currentStep.optional ? 'missing-optional' : 'missing')
        setRect(null)
        clearPoll()
      }
    }

    tick()
    pollRef.current = setInterval(tick, POLL_MS)
  }, [])

  // Khi đổi bước: điều hướng rồi tìm target
  useEffect(() => {
    if (!step) return
    let cancelled = false

    const run = async () => {
      if (step.route) {
        navigate(step.route)
        await new Promise((r) => setTimeout(r, 80))
      }
      if (!cancelled) locate(step)
    }
    run()

    return () => {
      cancelled = true
      clearPoll()
    }
  }, [tourId, stepIndex, step, navigate, locate])

  // Cập nhật vị trí khi scroll/resize
  useEffect(() => {
    if (!step || status === 'idle') return
    const update = () => {
      const el = queryTarget(step.selector)
      const r = rectOf(el)
      if (r) setRect(r)
    }
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [step, status])

  const goNext = useCallback(() => {
    if (!tour) return
    if (stepIndex >= tour.steps.length - 1) {
      endTour()
      return
    }
    setStepIndex((i) => i + 1)
  }, [tour, stepIndex, endTour])

  const goPrev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1))
  }, [])

  // advanceOn click: bấm đúng vùng spotlight (kể cả con bên trong nút)
  useEffect(() => {
    if (!step || step.advanceOn !== 'click' || status !== 'ready') return
    let advanced = false

    const onClick = (e) => {
      const target = queryTarget(step.selector)
      if (!target || advanced) return
      if (!target.contains(e.target) && e.target !== target) return
      advanced = true
      // Cho NavLink/Button/form mở xong rồi mới next
      window.setTimeout(() => goNext(), 450)
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [step, status, goNext, stepIndex])

  const startTour = useCallback(
    (id, options = {}) => {
      const t = TOURS[id]
      if (!t) return
      const startAt = Math.min(
        Math.max(0, options.startAt ?? 0),
        Math.max(0, t.steps.length - 1)
      )
      clearPoll()
      setTourId(id)
      setStepIndex(startAt)
      setStatus('locating')
      // Từ trang hướng dẫn: về /guide để thấy menu. Từ nút trang: ở lại trang hiện tại.
      if (!options.stayOnPage) {
        navigate('/guide')
      }
    },
    [navigate]
  )

  const value = useMemo(
    () => ({
      active: !!tour,
      tourId,
      tour,
      step,
      stepIndex,
      stepCount: tour?.steps?.length ?? 0,
      isLast,
      status,
      rect,
      startTour,
      endTour,
      goNext,
      goPrev,
      skipOptional: goNext,
    }),
    [tour, tourId, step, stepIndex, isLast, status, rect, startTour, endTour, goNext, goPrev]
  )

  return (
    <TourContext.Provider value={value}>
      {children}
      {tour && step && (
        <TourOverlay
          tour={tour}
          step={step}
          stepIndex={stepIndex}
          isLast={isLast}
          status={status}
          rect={rect}
          onNext={goNext}
          onPrev={goPrev}
          onClose={endTour}
        />
      )}
    </TourContext.Provider>
  )
}

export function useTour() {
  const ctx = useContext(TourContext)
  if (!ctx) throw new Error('useTour must be used within TourProvider')
  return ctx
}

/** An toàn khi ngoài provider (trang login) */
export function useTourOptional() {
  return useContext(TourContext)
}

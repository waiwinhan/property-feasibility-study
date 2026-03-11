import { useEffect, useRef, useState } from 'react'

/**
 * Animates a numeric value from 0 → target on mount / when target changes.
 * Returns the animated value (number) to be formatted by the caller.
 */
export function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(0)
  const rafRef = useRef(null)
  const prevTarget = useRef(null)

  useEffect(() => {
    const end = target ?? 0
    if (prevTarget.current === end) return
    prevTarget.current = end
    const start = performance.now()
    function tick(now) {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(end * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else setValue(end)
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return value
}

/**
 * Returns true when viewport width < 768px (md breakpoint).
 * Reacts to window resize.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

// Minimal animation helpers — countUp + opacity fade only
export function countUp(el, end, duration = 600) {
  if (!el) return
  const start = 0
  const startTime = performance.now()
  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1)
    const ease = 1 - Math.pow(1 - progress, 3)
    el.textContent = Math.round(start + (end - start) * ease).toLocaleString()
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.2 },
}

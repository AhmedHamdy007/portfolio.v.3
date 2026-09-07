import { useEffect, useRef } from 'react'
import { usePortalStore, useScrollStore } from '@/store'

/**
 * Minimal right-edge scroll indicator: current section number, a thin
 * progress line, and the total. Updates imperatively via store subscription
 * so the 60fps scroll stream never re-renders React.
 */
export default function ScrollProgress() {
  const fillRef = useRef<HTMLDivElement>(null)
  const numRef = useRef<HTMLSpanElement>(null)
  const portal = usePortalStore((s) => s.activePortalId)

  useEffect(() => {
    const update = (p: number) => {
      if (fillRef.current) fillRef.current.style.transform = `scaleY(${p})`
      if (numRef.current) {
        numRef.current.textContent = String(Math.min(4, Math.floor(p * 3.999) + 1)).padStart(2, '0')
      }
    }
    update(useScrollStore.getState().scrollProgress)
    const unsub = useScrollStore.subscribe((s) => update(s.scrollProgress))
    return unsub
  }, [])

  return (
    <div
      className={`fixed right-7 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-3 transition-opacity duration-500 md:flex ${
        portal ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <span ref={numRef} className="text-[0.6rem] tracking-[0.3em] text-white/90">
        01
      </span>
      <div className="relative h-36 w-px overflow-hidden bg-white/25">
        <div
          ref={fillRef}
          className="absolute inset-x-0 top-0 h-full origin-top bg-white"
          style={{ transform: 'scaleY(0)' }}
        />
      </div>
      <span className="text-[0.6rem] tracking-[0.3em] text-white/50">04</span>
    </div>
  )
}

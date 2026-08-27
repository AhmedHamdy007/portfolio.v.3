import { useEffect } from 'react'
import { usePortalStore } from '@/store'

/**
 * Lightweight portal chrome. The actual work/project content lives in the
 * R3F portal so nested Drei scroll controls can receive wheel and touch input.
 */
export default function OverlayPanel() {
  const activePortalId = usePortalStore((state) => state.activePortalId)
  const setActivePortal = usePortalStore((state) => state.setActivePortal)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActivePortal(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [setActivePortal])

  if (!activePortalId) return null

  const isWork = activePortalId === 'work'

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close portal"
        className="portal-close pointer-events-auto"
        onClick={() => setActivePortal(null)}
      >
        <span aria-hidden="true" />
      </button>
      {isWork ? (
        <div className="absolute bottom-6 left-1/2 w-[min(32rem,calc(100vw-3rem))] -translate-x-1/2 text-center text-white/80">
          <p className="text-[0.72rem] leading-5 tracking-[0.05em]">
            “He possesses the drive, curiosity, persistence, and technical aptitude to become an outstanding DevOps engineer.”
          </p>
          <p className="mt-2 text-[0.58rem] tracking-[0.24em] text-white/60">— AMIN, PETRONAS TECHNICAL LEAD</p>
        </div>
      ) : (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-[0.6rem] tracking-[0.35em] text-white/70">PROJECTS / PAN</div>
      )}
    </div>
  )
}

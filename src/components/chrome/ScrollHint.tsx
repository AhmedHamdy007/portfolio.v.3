import { ChevronsDown } from 'lucide-react'
import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import { usePortalStore, useScrollStore } from '@/store'

/** Bottom-center "SCROLL" hint visible only at the very top of the journey. */
export default function ScrollHint() {
  const ref = useRef<HTMLDivElement>(null)
  const portal = usePortalStore((s) => s.activePortalId)
  const scrollProgress = useScrollStore((s) => s.scrollProgress)
  const visible = !portal && scrollProgress === 0

  useEffect(() => {
    if (!ref.current) return
    gsap.killTweensOf(ref.current)
    gsap.to(ref.current, {
      opacity: visible ? 1 : 0,
      duration: visible ? 1.5 : 0.4,
      delay: visible ? 1.5 : 0,
    })
  }, [visible])

  return (
    <div ref={ref} className="pointer-events-none fixed inset-x-0 bottom-6 z-40" style={{ opacity: 0 }}>
      <div className="animate-hint flex items-center justify-center gap-2 text-white">
        <ChevronsDown size={15} strokeWidth={1.6} />
        <span className="text-[0.7rem] tracking-[0.35em]">SCROLL</span>
      </div>
    </div>
  )
}

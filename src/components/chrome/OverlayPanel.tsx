import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import { usePortalStore } from '@/store'

const WORK = [
  { year: '2016', title: 'Parsons School of Design', subtitle: 'BFA Communication Design' },
  { year: '2018', title: 'Paperplane Co.', subtitle: 'UI Engineer' },
  { year: '2020', title: 'Lumen Labs', subtitle: 'Frontend Engineer' },
  { year: '2023', title: 'Studio Nova', subtitle: 'Senior Creative Developer' },
  { year: new Date().getFullYear().toString(), title: 'Living...', subtitle: 'Still shipping' },
]

const PROJECTS = [
  { title: 'Nebula — Brand Universe', date: 'Nov 2025', subtext: 'A WebGL brand world with shader-driven nebulae and scroll choreography.' },
  { title: 'Halcyon Skies', date: 'Apr 2024', subtext: 'An interactive short film rendered in real time with R3F and GSAP.' },
  { title: 'Atlas of Light', date: 'Feb 2024', subtext: 'A 3D data-visualization atlas of global light pollution.' },
  { title: 'Petal — E-commerce', date: 'Sep 2023', subtext: 'A motion-first storefront with physics-based product reveals.' },
]

/**
 * DOM overlay shown when a 3D tile is clicked — mirrors the reference's
 * portal behavior (dim the world, show content, close with the X).
 */
export default function OverlayPanel() {
  const activePortalId = usePortalStore((s) => s.activePortalId)
  const setActivePortal = usePortalStore((s) => s.setActivePortal)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!panelRef.current) return
    if (activePortalId) {
      gsap.fromTo(
        panelRef.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }
      )
      gsap.fromTo(
        panelRef.current.querySelectorAll('.panel-item'),
        { opacity: 0, y: 26 },
        { opacity: 1, y: 0, stagger: 0.08, duration: 0.6, delay: 0.15, ease: 'power3.out' }
      )
    }
  }, [activePortalId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setActivePortal(null)
    document.body.addEventListener('keydown', onKey)
    return () => document.body.removeEventListener('keydown', onKey)
  }, [setActivePortal])

  if (!activePortalId) return null
  const isWork = activePortalId === 'work'

  return (
    <div className="fixed inset-0 z-50" style={{ background: 'rgba(4, 20, 40, 0.55)', backdropFilter: 'blur(6px)' }}>
      <div className="close-x" onClick={() => setActivePortal(null)} />
      <div
        ref={panelRef}
        className="mx-auto flex h-full max-w-2xl flex-col justify-center overflow-y-auto px-8 py-20"
      >
        <p className="panel-item mb-2 text-[0.65rem] tracking-[0.4em] text-white/60">
          {isWork ? 'TIMELINE' : 'SELECTED'}
        </p>
        <h2 className="panel-item font-serif-display mb-12 text-3xl italic text-white md:text-5xl">
          {isWork ? 'Work & Education' : 'Side Projects'}
        </h2>

        {isWork
          ? WORK.map((w) => (
              <div key={w.year + w.title} className="panel-item grid grid-cols-[64px_1fr] gap-6 border-t border-white/20 py-6">
                <span className="pt-1 text-xs tracking-[0.2em] text-white/60">{w.year}</span>
                <div>
                  <h3 className="font-serif-display text-xl italic text-white md:text-2xl">{w.title}</h3>
                  <p className="mt-1 text-sm font-light text-white/70">{w.subtitle}</p>
                </div>
              </div>
            ))
          : PROJECTS.map((p) => (
              <div key={p.title} className="panel-item border-t border-white/20 py-6">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-serif-display text-xl italic text-white md:text-2xl">{p.title}</h3>
                  <span className="text-xs tracking-[0.2em] text-white/60">{p.date}</span>
                </div>
                <p className="mt-2 max-w-lg text-sm font-light leading-relaxed text-white/70">{p.subtext}</p>
              </div>
            ))}
        <div className="panel-item border-t border-white/20" />
      </div>
    </div>
  )
}

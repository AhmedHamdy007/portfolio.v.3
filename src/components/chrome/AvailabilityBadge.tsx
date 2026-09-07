import { usePortalStore } from '@/store'

/** Top-left availability badge with a live pulsing dot. */
export default function AvailabilityBadge() {
  const portal = usePortalStore((s) => s.activePortalId)

  return (
    <div
      className={`fixed left-7 top-7 z-40 flex items-center gap-2.5 transition-opacity duration-500 ${
        portal ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
      </span>
      <span className="text-[0.6rem] tracking-[0.35em] text-white/90">OPEN&nbsp;TO&nbsp;WORK</span>
    </div>
  )
}

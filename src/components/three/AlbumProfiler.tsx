import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { usePortalStore } from '@/store'

/** Explicit opt-in, including preview builds; never collects or sends analytics. */
export default function AlbumProfiler() {
  const gl = useThree(state => state.gl)
  const sample = useRef({ started: 0, last: 0, frames: [] as number[], tasks: [] as number[] })
  useEffect(() => {
    if (!new URLSearchParams(location.search).has('albumProfile')) return
    const observer = typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes.includes('longtask')
      ? new PerformanceObserver(list => {
        if (sample.current.started) sample.current.tasks.push(...list.getEntries().map(entry => entry.duration))
      }) : null
    observer?.observe({ type: 'longtask' })
    const unsubscribe = usePortalStore.subscribe((next, previous) => {
      if (next.activePortalId === 'album' && previous.activePortalId !== 'album') {
        sample.current = { started: performance.now(), last: 0, frames: [], tasks: [] }
      } else if (previous.activePortalId === 'album' && next.activePortalId !== 'album') {
        const { started, frames, tasks } = sample.current
        const sorted = [...frames].sort((a, b) => a - b)
        const resources = (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
          .filter(entry => entry.startTime >= started)
        console.info('[album-profile]', JSON.stringify({
          durationMs: Math.round(performance.now() - started), frames: frames.length,
          medianFrameMs: sorted[Math.floor(sorted.length * 0.5)] ?? 0,
          p95FrameMs: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
          maxFrameMs: Math.max(0, ...frames), framesOver50ms: frames.filter(ms => ms > 50).length,
          longTasks: tasks.length, blockingMs: Math.round(tasks.reduce((sum, ms) => sum + Math.max(0, ms - 50), 0)),
          textures: gl.info.memory.textures, geometries: gl.info.memory.geometries,
          transferBytes: resources.reduce((sum, entry) => sum + entry.transferSize, 0),
          resources: resources.map(entry => ({ url: new URL(entry.name).pathname, ms: Math.round(entry.duration), bytes: entry.transferSize })),
        }))
        sample.current.started = 0
      }
    })
    return () => { observer?.disconnect(); unsubscribe() }
  }, [gl])
  useFrame(() => {
    const s = sample.current
    if (!s.started) return
    const now = performance.now()
    if (document.visibilityState !== 'visible') { s.last = 0; return }
    if (s.last && s.frames.length < 18000) s.frames.push(Math.round((now - s.last) * 100) / 100)
    s.last = now
  }, -100)
  return null
}

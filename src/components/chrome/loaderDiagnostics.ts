/** Opt-in, development-only startup measurements; never runs in production. */
export function traceLoader() {
  if (!import.meta.env.DEV || !new URLSearchParams(location.search).has('loaderProfile')) return () => {}
  const started = performance.now()
  const tasks: number[] = []
  let previous = started
  let maxGap = 0
  const observer = new PerformanceObserver(list => {
    tasks.push(...list.getEntries().filter(entry => entry.startTime >= started).map(entry => entry.duration))
  })
  if (PerformanceObserver.supportedEntryTypes.includes('longtask')) observer.observe({ type: 'longtask' })
  const timer = window.setInterval(() => {
    const now = performance.now()
    maxGap = Math.max(maxGap, now - previous)
    previous = now
  }, 50)
  return () => {
    observer.disconnect()
    clearInterval(timer)
    const elapsed = performance.now() - started
    if (elapsed < 100) return // Ignore StrictMode's effect probe.
    console.info('[loader-profile]', JSON.stringify({ elapsedMs: Math.round(elapsed), maxGapMs: Math.round(maxGap), blockingMs: Math.round(tasks.reduce((sum, duration) => sum + Math.max(0, duration - 50), 0)), longTasks: tasks.length, worstTasksMs: tasks.sort((a, b) => b - a).slice(0, 5).map(Math.round) }))
  }
}

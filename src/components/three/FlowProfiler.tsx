import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { usePortalStore, useScrollStore } from '@/store'
import { useLoadingState } from '@/components/chrome/loadingState'

/** Local, explicit opt-in diagnostic. No telemetry leaves the browser. */
export default function FlowProfiler() {
  const enabled = useRef(new URLSearchParams(location.search).has('flowProfile'))
  const gl = useThree(state => state.gl)
  const sample = useRef({ last: 0, since: 0, stage: '', frames: [] as number[], draws: [] as number[], triangles: [] as number[] })
  useEffect(() => {
    if (!enabled.current) return
    const autoReset = gl.info.autoReset
    Object.assign(gl.info, { autoReset: false })
    return () => { Object.assign(gl.info, { autoReset }) }
  }, [gl])
  useFrame(() => {
    if (!enabled.current) return
    const state = sample.current
    const now = performance.now()
    const portal = usePortalStore.getState()
    const progress = useScrollStore.getState().scrollProgress
    const phase = useLoadingState.getState().phase
    const stage = phase !== 'entered' ? phase : portal.activePortalId ? `${portal.activePortalId}${portal.isClosing ? '-exit' : ''}`
      : progress > 0.78 ? 'gateway' : progress > 0.4 ? 'door' : progress > 0.3 ? 'descent' : progress > 0.001 ? 'opening-turn' : 'hero'
    const visible = document.visibilityState === 'visible'
    // Keep boundary frames in the preceding window instead of discarding the
    // very spikes this diagnostic is meant to find when the section changes.
    if (visible && state.last && now - state.last < 1000) {
      state.frames.push(now - state.last)
      state.draws.push(gl.info.render.calls)
      state.triangles.push(gl.info.render.triangles)
    }
    if ((stage !== state.stage || !visible || now - state.since > 5000) && state.frames.length) {
      const percentile = (values: number[], p: number) => values.sort((a, b) => a - b)[Math.floor((values.length - 1) * p)]
      console.info('[flow-profile]', JSON.stringify({ stage: state.stage, samples: state.frames.length,
        medianMs: +percentile(state.frames, 0.5).toFixed(2), p95Ms: +percentile(state.frames, 0.95).toFixed(2),
        over50: state.frames.filter(ms => ms > 50).length,
        over33: state.frames.filter(ms => ms > 33.34).length, maxMs: +Math.max(...state.frames).toFixed(2),
        medianDraws: percentile(state.draws, 0.5), medianTriangles: percentile(state.triangles, 0.5), dpr: gl.getPixelRatio(),
      }))
      state.frames.length = state.draws.length = state.triangles.length = 0; state.since = now
    }
    if (stage !== state.stage || !visible) { state.stage = stage; state.since = now }
    state.last = visible ? now : 0
    gl.info.reset()
  }, -1000)
  return null
}

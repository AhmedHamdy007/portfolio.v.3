import { useEffect, useRef, useState } from 'react'
import { usePortalStore, useScrollStore } from '@/store'
import { useAlbumState } from './albumState'
import { albumStoryProgress } from './layerJourney'

/** A deliberately quiet, synthesized sound bed. Nothing is fetched or started on mount. */
function createMemoryAudio(onError: () => void) {
  const context = new AudioContext()
  const output = context.createGain()
  output.gain.value = 0
  output.connect(context.destination)
  const voices = [55, 82.5].map((frequency, index) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    gain.gain.value = index === 0 ? 0.017 : 0.008
    oscillator.connect(gain).connect(output)
    oscillator.start()
    return { oscillator, gain }
  })
  const shutterBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.065), context.sampleRate)
  const samples = shutterBuffer.getChannelData(0)
  for (let i = 0; i < samples.length; i++) {
    const progress = i / samples.length
    samples[i] = (Math.random() * 2 - 1) * Math.exp(-progress * 9)
  }
  const oneShots = new Set<AudioBufferSourceNode>()
  // Null makes the first `running(false)` suspend a newly created context too.
  let wanted: boolean | null = null
  let disposed = false
  let suspension: ReturnType<typeof setTimeout> | undefined
  let lastShutter = -Infinity
  let lastProgress = -1

  const silence = () => {
    output.gain.cancelScheduledValues(context.currentTime)
    output.gain.setTargetAtTime(0, context.currentTime, 0.012)
    oneShots.forEach(source => { source.stop(); source.disconnect() })
    oneShots.clear()
  }

  return {
    running(next: boolean) {
      if (disposed || wanted === next) return
      wanted = next
      clearTimeout(suspension)
      if (!next) {
        silence()
        suspension = setTimeout(() => {
          if (!disposed && !wanted && context.state !== 'closed') void context.suspend().catch(() => {})
        }, 65)
        return
      }
      // The first resume is called synchronously from the Sound button's click handler.
      void context.resume().then(() => {
        if (disposed) return
        if (!wanted) {
          silence()
          void context.suspend().catch(() => {})
          return
        }
        output.gain.cancelScheduledValues(context.currentTime)
        output.gain.setTargetAtTime(0.65, context.currentTime, 0.32)
      }).catch(() => { if (!disposed) onError() })
    },
    progress(progress: number) {
      if (disposed || Math.abs(progress - lastProgress) < 0.003) return
      lastProgress = progress
      const interior = Math.sin(Math.PI * Math.min(1, Math.max(0, (progress - 0.23) / 0.71)))
      voices[0].oscillator.frequency.setTargetAtTime(55 + interior * 4, context.currentTime, 0.4)
      voices[1].gain.gain.setTargetAtTime(0.004 + interior * 0.006, context.currentTime, 0.4)
    },
    shutter() {
      if (disposed || !wanted || context.state !== 'running' || context.currentTime - lastShutter < 1.8) return
      lastShutter = context.currentTime
      const source = context.createBufferSource()
      const filter = context.createBiquadFilter()
      const gain = context.createGain()
      source.buffer = shutterBuffer
      filter.type = 'bandpass'
      filter.frequency.value = 1450
      filter.Q.value = 0.7
      gain.gain.value = 0.06
      source.connect(filter).connect(gain).connect(output)
      oneShots.add(source)
      source.onended = () => {
        oneShots.delete(source)
        source.disconnect(); filter.disconnect(); gain.disconnect()
      }
      source.start()
    },
    dispose() {
      if (disposed) return
      disposed = true
      wanted = false
      clearTimeout(suspension)
      silence()
      voices.forEach(({ oscillator, gain }) => { oscillator.stop(); oscillator.disconnect(); gain.disconnect() })
      output.disconnect()
      void context.close().catch(() => {})
    },
  }
}

export default function MemoryAudio({ paused = false }: { paused?: boolean }) {
  const [enabled, setEnabled] = useState(false)
  const [failed, setFailed] = useState(false)
  const engine = useRef<ReturnType<typeof createMemoryAudio> | null>(null)
  const intent = useRef(false)
  const mounted = useRef(false)
  const supported = typeof window !== 'undefined' && 'AudioContext' in window

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      intent.current = false
      engine.current?.dispose()
      engine.current = null
    }
  }, [])

  useEffect(() => {
    let previousProgress = albumStoryProgress(useScrollStore.getState().scrollProgress)
    const sync = () => {
      const portal = usePortalStore.getState()
      const album = useAlbumState.getState()
      if (portal.activePortalId !== 'album' || portal.isClosing) {
        intent.current = false
        setEnabled(false)
      }
      const audible = intent.current && !paused && !document.hidden
        && portal.activePortalId === 'album' && !portal.isClosing && album.entryReady && album.selected === null
      engine.current?.running(audible)
      // Do not play a shutter for movement made while sound was unavailable.
      previousProgress = albumStoryProgress(useScrollStore.getState().scrollProgress)
    }
    const unsubscribeScroll = useScrollStore.subscribe(state => {
      const scrollProgress = albumStoryProgress(state.scrollProgress)
      engine.current?.progress(scrollProgress)
      if ((previousProgress < 0.25 && scrollProgress >= 0.25)
        || (previousProgress < 0.93 && scrollProgress >= 0.93)) engine.current?.shutter()
      previousProgress = scrollProgress
    })
    const unsubscribePortal = usePortalStore.subscribe(sync)
    const unsubscribeAlbum = useAlbumState.subscribe(sync)
    document.addEventListener('visibilitychange', sync)
    sync()
    return () => {
      unsubscribeScroll(); unsubscribePortal(); unsubscribeAlbum()
      document.removeEventListener('visibilitychange', sync)
    }
  }, [paused])

  const toggle = () => {
    if (!supported || failed) return
    intent.current = !intent.current
    setEnabled(intent.current)
    if (intent.current && !engine.current) {
      try {
        engine.current = createMemoryAudio(() => {
          intent.current = false
          engine.current?.dispose()
          engine.current = null
          if (mounted.current) { setEnabled(false); setFailed(true) }
        })
      } catch {
        intent.current = false
        setEnabled(false); setFailed(true)
        return
      }
    }
    const portal = usePortalStore.getState()
    const album = useAlbumState.getState()
    engine.current?.running(intent.current && !paused && !document.hidden
      && portal.activePortalId === 'album' && !portal.isClosing && album.entryReady && album.selected === null)
    engine.current?.progress(albumStoryProgress(useScrollStore.getState().scrollProgress))
  }

  return <button type="button" className="archive-text-button archive-sound" aria-pressed={enabled}
    disabled={!supported || failed} title={!supported || failed ? 'Sound is unavailable in this browser' : 'Optional, quiet ambient sound'}
    onClick={toggle}>Sound {enabled ? 'on' : 'off'}</button>
}

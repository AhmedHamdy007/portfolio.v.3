import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import gsap from 'gsap'
import { DRIFT_MOMENTS } from '@/constants/album'
import { advanceLoadingCounter, loadingTarget, useLoadingState } from './loadingState'
import './signature-loader.css'
import { traceLoader } from './loaderDiagnostics'

const CONTACT_SHEETS = [2, 1, 4, 6, 7, 8, 10, 3].map(index => DRIFT_MOMENTS[index])

export default function Preloader() {
  const { progress, active, errors, total } = useProgress()
  const sceneReady = useLoadingState(state => state.sceneReady)
  const [done, setDone] = useState(() => useLoadingState.getState().phase === 'entered')
  const [photos, setPhotos] = useState(0)
  const [availablePhotos, setAvailablePhotos] = useState<number[]>([])
  const [reelReady, setReelReady] = useState(false)
  const [documentReady, setDocumentReady] = useState(false)
  const [introReady, setIntroReady] = useState(false)
  const [counterReady, setCounterReady] = useState(false)
  const [slow, setSlow] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const meter = useRef<HTMLDivElement>(null)
  const number = useRef<HTMLSpanElement>(null)
  const counter = useRef({ value: 1 })
  const counterTarget = useRef(1)
  const reduced = useRef(false)
  const exiting = useRef(false)
  const reel = useRef<gsap.core.Timeline | null>(null)
  const exit = useRef<gsap.core.Timeline | null>(null)
  const exitTick = useRef<(() => void) | null>(null)

  const paint = () => {
    const value = Math.round(counter.current.value)
    if (number.current) number.current.textContent = String(value)
    meter.current?.setAttribute('aria-valuenow', String(value))
  }

  useEffect(() => {
    if (done || !panel.current) return
    const finishTrace = traceLoader()
    let cancelled = false
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduced.current = query.matches
    const onMotionChange = () => {
      reduced.current = query.matches
      if (query.matches) { reel.current?.pause(); setReelReady(true) }
    }
    query.addEventListener('change', onMotionChange)
    const introTimer = window.setTimeout(() => setIntroReady(true), query.matches ? 0 : 1100)
    const slowTimer = window.setTimeout(() => setSlow(true), 20000)
    let cleanLoad = () => {}
    const loaded = new Promise<void>(resolve => {
      if (document.readyState === 'complete') resolve()
      else window.addEventListener('load', onLoad, { once: true })
      function onLoad() { resolve() }
      // Listener is removed below even if the page is still loading.
      cleanLoad = () => window.removeEventListener('load', onLoad)
    })
    // Keep the signature's shape stable before the intro appears.
    Promise.all([loaded, document.fonts.load('400 24px Soria'), document.fonts.ready]).then(() => {
      if (!cancelled) setDocumentReady(true)
    }).catch(() => { if (!cancelled) setDocumentReady(true) })

    let settled = 0
    const images = CONTACT_SHEETS.map(({ src }, index) => {
      const image = new Image()
      const finish = (success: boolean) => {
        if (cancelled) return
        if (success) setAvailablePhotos(indices => indices.includes(index) ? indices : [...indices, index].sort((a, b) => a - b))
        setPhotos(++settled / CONTACT_SHEETS.length)
      }
      image.onload = () => { image.decode().catch(() => {}).then(() => finish(image.naturalWidth > 0)) }
      image.onerror = () => finish(false)
      image.src = src
      return image
    })
    const siblings = Array.from(panel.current.parentElement?.children ?? [])
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== panel.current)
      .map(element => ({ element, inert: element.inert }))
    siblings.forEach(({ element }) => { element.inert = true })
    panel.current.focus({ preventScroll: true })
    const blockScroll = (event: Event) => event.preventDefault()
    window.addEventListener('wheel', blockScroll, { capture: true, passive: false })
    window.addEventListener('touchmove', blockScroll, { capture: true, passive: false })
    return () => {
      cancelled = true
      finishTrace()
      cleanLoad()
      window.clearTimeout(introTimer); window.clearTimeout(slowTimer)
      images.forEach(image => { image.onload = null; image.onerror = null })
      query.removeEventListener('change', onMotionChange)
      window.removeEventListener('wheel', blockScroll, true)
      window.removeEventListener('touchmove', blockScroll, true)
      siblings.forEach(({ element, inert }) => { element.inert = inert })
      reel.current?.kill(); exit.current?.kill()
      if (exitTick.current) gsap.ticker.remove(exitTick.current)
    }
  }, [done])

  useEffect(() => {
    if (done || photos < 1 || !panel.current) return
    const allSheets = Array.from(panel.current.querySelectorAll<HTMLElement>('.signature-loader__photo'))
    const sheets = availablePhotos.map(index => allSheets[index])
    gsap.set(allSheets, { opacity: 0 })
    if (sheets[0]) gsap.set(sheets[0], { opacity: 1 })
    if (reduced.current || sheets.length < 2) {
      const pause = gsap.delayedCall(1.2, () => setReelReady(true))
      return () => { pause.kill() }
    }
    // A wall-clock cadence keeps GSAP lag smoothing from stretching the intro
    // while WebGL compiles. Every decoded photo still gets its own exposure.
    let frame = 1
    let timer = 0
    const expose = () => {
      if (exiting.current) return
      reel.current?.progress(1).kill()
      if (frame === sheets.length || reduced.current) { setReelReady(true); return }
      const index = frame
      const sheet = sheets[index]
      const previous = sheets[index - 1]
      gsap.set(sheet, { opacity: 0, zIndex: index + 1 })
      reel.current = gsap.timeline()
        .to(sheet, { opacity: 1, duration: 0.25, ease: 'sine.inOut' }, 0)
        // Keep the outgoing image underneath until the incoming image covers it.
        .to(previous, { opacity: 0, duration: 0.18, ease: 'sine.inOut' }, 0.17)
      frame++
      timer = window.setTimeout(expose, 500)
    }
    timer = window.setTimeout(expose, 400)
    return () => { window.clearTimeout(timer); reel.current?.kill() }
  }, [photos, availablePhotos, done])

  useEffect(() => {
    counterTarget.current = Math.max(counterTarget.current, loadingTarget(progress, photos, documentReady, sceneReady))
  }, [progress, photos, documentReady, sceneReady, done])

  useEffect(() => {
    if (done) return
    let previousTime = performance.now()
    let settled = false
    const tick = () => {
      const now = performance.now()
      const elapsed = (now - previousTime) / 1000
      previousTime = now
      if (exiting.current) return
      counter.current.value = advanceLoadingCounter(counter.current.value, counterTarget.current, elapsed)
      paint()
      if (!settled && counter.current.value >= 99) {
        settled = true
        setCounterReady(true)
      }
    }
    gsap.ticker.add(tick)
    return () => { gsap.ticker.remove(tick) }
  }, [done])

  const assetsReady = total > 0 && progress >= 100 && !active && errors.length === 0 && sceneReady && documentReady && photos === 1
  const canExit = assetsReady && introReady && reelReady && counterReady
  useEffect(() => {
    if (!canExit || done || exiting.current || !panel.current) return
    const delay = gsap.delayedCall(0.2, () => {
      if (!panel.current || exiting.current) return
      exiting.current = true
      reel.current?.kill()
      gsap.killTweensOf(counter.current)
      useLoadingState.setState({ phase: 'revealing' })
      const scope = (selector: string) => panel.current!.querySelectorAll(selector)
      const timeline = gsap.timeline({ paused: true, onComplete: () => {
        if (exitTick.current) gsap.ticker.remove(exitTick.current)
        useLoadingState.setState({ phase: 'entered' })
        setDone(true)
      } })
      exit.current = timeline
      timeline.to(counter.current, { value: 100, duration: 0.35, onUpdate: paint }, 0)
      if (reduced.current) {
        timeline.to(panel.current, { opacity: 0, duration: 0.25 }, 0.35)
      } else {
        timeline.to(scope('.signature-loader__ink'), { opacity: 0, y: -6, duration: 0.45, ease: 'sine.inOut' }, 0.4)
          .to(scope('.signature-loader__shutter--top'), { yPercent: -100, duration: 1.2, ease: 'power2.inOut' }, 0.7)
          .to(scope('.signature-loader__shutter--bottom'), { yPercent: 100, duration: 1.2, ease: 'power2.inOut' }, 0.7)
      }
      // Keep this UI reveal on real elapsed time when the 3D scene resumes.
      // This is local: the portfolio's other GSAP timelines remain untouched.
      const startedAt = performance.now()
      exitTick.current = () => timeline.time((performance.now() - startedAt) / 1000)
      gsap.ticker.add(exitTick.current)
    })
    return () => { delay.kill() }
  }, [canExit, done])

  if (done) return null
  return <div ref={panel} className="signature-loader" tabIndex={-1} role="dialog" aria-modal="true" aria-label="Loading Ahmed Hamdy’s portfolio"
    onKeyDown={event => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key) && event.target === event.currentTarget) event.preventDefault()
      if (event.key === 'Tab') {
        event.preventDefault()
        const buttons = Array.from(panel.current?.querySelectorAll('button') ?? [])
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
        if (buttons.length) buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus()
      }
    }}>
    <div className="signature-loader__shutter signature-loader__shutter--top" />
    <div className="signature-loader__shutter signature-loader__shutter--bottom" />
    <div className="signature-loader__stage signature-loader__ink">
      <span className="signature-loader__initial signature-loader__initial--a" aria-hidden="true">A</span>
      <span className="signature-loader__initial signature-loader__initial--h" aria-hidden="true">H</span>
      <div className="signature-loader__contact-sheet">
        <header className="signature-loader__label">
          <span>AHMED HAMDY</span>
          <div ref={meter} className="signature-loader__count" role="progressbar" aria-label="Portfolio assets loaded" aria-valuemin={0} aria-valuemax={100} aria-valuenow={1}>
            <span ref={number}>1</span>
          </div>
        </header>
        <div className="signature-loader__reel" aria-hidden="true">
          {CONTACT_SHEETS.map((moment, index) => <figure className="signature-loader__photo" key={moment.src}>
            <img src={moment.src} alt="" decoding="async" fetchPriority={index === 0 ? 'high' : 'auto'} onError={event => { event.currentTarget.style.visibility = 'hidden' }} />
          </figure>)}
        </div>
      </div>
    </div>
    <p className="signature-loader__signature signature-loader__ink">A FEW MOMENTS BEFORE WE BEGIN.</p>
    {((slow && !assetsReady) || errors.length > 0) && <div className="signature-loader__retry signature-loader__ink">
      <p>{errors.length ? 'Please try again to load the complete experience.' : 'The 3D assets are taking a little longer. You can wait or try again.'}</p>
      <button onClick={() => window.location.reload()}>Reload the experience</button>
    </div>}
  </div>
}

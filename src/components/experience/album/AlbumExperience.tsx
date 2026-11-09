import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { DRIFT_MOMENTS } from '@/constants/album'
import { useScrollStore } from '@/store'
import { useAlbumState } from './albumState'
import { inArchive } from './archiveLayout'
import { albumStoryProgress, albumScrollProgress, inMemoryLayer } from './layerJourney'
import './album.css'

const subscribeReducedMotion = (callback: () => void) => {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
  preference.addEventListener('change', callback)
  return () => preference.removeEventListener('change', callback)
}
const getReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function Editorial({ kind, hidden, children }: { kind: 'opening' | 'passage' | 'inside' | 'closing'; hidden: boolean; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const letters = ref.current?.querySelectorAll<HTMLElement>('[data-memory-letter]')
    const update = (p: number) => {
      const node = ref.current
      if (!node) return
      const opacity = hidden ? 0 : kind === 'opening' ? Math.max(0, 1 - p / 0.13)
        : kind === 'passage' ? Math.min(1, Math.max(0, (p - 0.16) / 0.04)) * (1 - Math.min(1, Math.max(0, (p - 0.23) / 0.03)))
        : kind === 'inside' ? Math.min(1, Math.max(0, (p - 0.38) / 0.035)) * (1 - Math.min(1, Math.max(0, (p - 0.46) / 0.03)))
        : Math.min(1, Math.max(0, (p - 0.953) / 0.023))
      node.style.opacity = opacity.toFixed(3)
      const travel = kind === 'passage' || kind === 'inside' ? 6 : 18
      node.style.transform = motionPreference.matches ? 'none' : `translate3d(0, ${(1 - opacity) * travel}px, 0)`
      node.inert = opacity < 0.05
      node.setAttribute('aria-hidden', String(opacity < 0.05))
      letters?.forEach((letter, index) => {
        const developed = Math.min(1, Math.max(0, (p - 0.956 - index * 0.0022) / 0.021))
        letter.style.opacity = developed.toFixed(3)
        letter.style.transform = motionPreference.matches ? 'none' : `translate3d(0, ${(1 - developed) * 8}px, 0)`
      })
    }
    update(albumStoryProgress(useScrollStore.getState().scrollProgress))
    return useScrollStore.subscribe(state => update(albumStoryProgress(state.scrollProgress)))
  }, [kind, hidden])
  return <section ref={ref} className={`archive-editorial archive-editorial--${kind}`}>{children}</section>
}

function LayerCaption({ hidden }: { hidden: boolean }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = (p: number) => {
      const node = ref.current
      if (!node) return
      const fade = (value: number) => {
        const t = Math.min(1, Math.max(0, value))
        return t * t * (3 - 2 * t)
      }
      const opacity = hidden || reduced.matches ? 0 : fade((p - 0.68) / 0.025) * (1 - fade((p - 0.745) / 0.025))
      node.style.opacity = opacity.toFixed(3)
      node.inert = opacity < 0.05
      node.setAttribute('aria-hidden', String(opacity < 0.05))
    }
    update(useScrollStore.getState().scrollProgress)
    return useScrollStore.subscribe(state => update(state.scrollProgress))
  }, [hidden])
  return <section ref={ref} className="archive-layer-caption">There is more beneath a moment.</section>
}

export default function AlbumExperience() {
  const reduced = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false)
  const inGallery = useScrollStore(state => inArchive(albumStoryProgress(state.scrollProgress)) && (reduced || !inMemoryLayer(state.scrollProgress)))
  const remembered = useScrollStore(state => albumStoryProgress(state.scrollProgress) >= 0.955)
  const inLayer = useScrollStore(state => !reduced && inMemoryLayer(state.scrollProgress))
  const selected = useAlbumState(state => state.selected)
  const ready = useAlbumState(state => state.ready)
  const hasError = useAlbumState(state => state.assetErrors.includes('Photographs'))
  const modelError = useAlbumState(state => state.assetErrors.includes('Memory camera'))
  const select = useAlbumState(state => state.select)
  const [indexOpen, setIndexOpen] = useState(false)
  useEffect(() => {
    useAlbumState.setState({ indexOpen })
    return () => { useAlbumState.setState({ indexOpen: false }) }
  }, [indexOpen])
  const returnButton = useRef<HTMLButtonElement>(null)
  const indexButton = useRef<HTMLButtonElement>(null)
  const indexClose = useRef<HTMLButtonElement>(null)
  const previousSelected = useRef<number | null>(null)
  const moment = selected === null ? null : DRIFT_MOMENTS[selected]
  const goTo = (value: number) => {
    select(null); setIndexOpen(false)
    const element = document.querySelector<HTMLElement>('[data-scroll-owner="album"]')
    element?.scrollTo({ top: (element.scrollHeight - element.clientHeight) * albumScrollProgress(value), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }
  const step = (direction: number) => {
    if (selected !== null) select((selected + direction + DRIFT_MOMENTS.length) % DRIFT_MOMENTS.length)
  }
  useEffect(() => {
    if (selected !== null && previousSelected.current === null) returnButton.current?.focus({ preventScroll: true })
    previousSelected.current = selected
    const key = (event: KeyboardEvent) => {
      if (selected !== null && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
        event.preventDefault(); event.stopImmediatePropagation()
        select((selected + (event.key === 'ArrowRight' ? 1 : -1) + DRIFT_MOMENTS.length) % DRIFT_MOMENTS.length)
      }
      if (event.key === 'Escape' && (selected !== null || indexOpen)) {
        event.preventDefault(); event.stopImmediatePropagation()
        select(null); setIndexOpen(false); indexButton.current?.focus({ preventScroll: true })
      }
    }
    document.addEventListener('keydown', key, true)
    return () => document.removeEventListener('keydown', key, true)
  }, [selected, select, indexOpen])
  useEffect(() => { if (indexOpen) indexClose.current?.focus({ preventScroll: true }) }, [indexOpen])

  return <div className="drift-ui archive-ui" data-album-focused={moment || indexOpen ? 'true' : 'false'} aria-label="Ahmed Hamdy — the unfolding archive">
    {hasError && <p className="archive-status" role="status">The 3D photographs couldn't load. Open the contact sheet to browse the images.</p>}
    {modelError && !hasError && <p className="archive-status" role="status">The camera model couldn't load. Your photographs are still available below.</p>}
    {!ready && !hasError && <p className="archive-status" role="status">Preparing the photographs…</p>}
    <Editorial kind="opening" hidden={!!moment || indexOpen}>
      <h1>Inside<br />a <em>moment.</em></h1>
    </Editorial>
    <Editorial kind="passage" hidden={!!moment || indexOpen}>
      <h2>Look again.</h2>
    </Editorial>
    <Editorial kind="inside" hidden={!!moment || indexOpen}>
      <h2>A different kind of perspective.</h2>
    </Editorial>
    <Editorial kind="closing" hidden={!!moment || indexOpen}>
      <h2 className="archive-remembered" aria-label="Remembered">{'REMEMBERED'.split('').map((letter, index) => <span data-memory-letter aria-hidden="true" key={index}>{letter}</span>)}</h2>
      <button className="archive-text-button" onClick={() => goTo(0.68)}>Find your way back <span>↗</span></button>
    </Editorial>
    {inGallery && !moment && !indexOpen && <div className="archive-gallery-heading"><h2>The people in it.</h2><span>Scroll through. Drag to look. Select a moment.</span></div>}
    <LayerCaption hidden={!!moment || indexOpen || reduced} />
    {moment && hasError && !indexOpen && <img className="archive-fallback-image" src={moment.src} alt={moment.title} />}
    {moment && !indexOpen && <section className="archive-caption" aria-live="polite">
      <p>{String(selected! + 1).padStart(2, '0')} / {DRIFT_MOMENTS.length} <span>{moment.meta}</span></p>
      <h2>{moment.title}</h2>
      <div className="archive-photo-controls">
        <button aria-label="Previous photograph" onClick={() => step(-1)}>←</button>
        <button ref={returnButton} onClick={() => { select(null); indexButton.current?.focus({ preventScroll: true }) }}>Return to collection</button>
        <button aria-label="Next photograph" onClick={() => step(1)}>→</button>
      </div>
    </section>}
    <footer className="archive-footer">
      {hasError && <button ref={indexButton} aria-expanded={indexOpen} aria-controls="album-contact-sheet" onClick={() => setIndexOpen(value => !value)}>Open photo fallback</button>}
      <p>{moment ? '← → to explore · Esc to return' : inLayer ? 'Between the frames ↓' : inGallery ? 'Your own way through.' : remembered ? '' : 'Scroll to look closer ↓'}</p>
    </footer>
    {indexOpen && <aside id="album-contact-sheet" className="drift-ui__index archive-index" aria-label="All photographs">
      <div className="archive-index-header"><div><p>THE PERSONAL ARCHIVE</p><h2>A closer look.</h2></div><button ref={indexClose} onClick={() => { setIndexOpen(false); indexButton.current?.focus() }}>Close ×</button></div>
      <div className="archive-index-grid">{DRIFT_MOMENTS.map((item, index) => <button key={item.src} onClick={() => { select(index); setIndexOpen(false) }}>
        <img src={item.src} alt={item.title} loading="lazy" decoding="async" />
        <span><small>{String(index + 1).padStart(2, '0')}</small>{item.title}</span>
      </button>)}</div>
    </aside>}
  </div>
}

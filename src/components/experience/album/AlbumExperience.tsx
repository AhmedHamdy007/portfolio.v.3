import { useEffect, useRef, useState, type ReactNode } from 'react'
import { DRIFT_MOMENTS } from '@/constants/album'
import { useScrollStore } from '@/store'
import { useAlbumState } from './albumState'
import { inArchive } from './albumJourney'
import './album.css'

// Opacity is transient animation state, not a reason to reconcile the entire UI.
function ChapterText({ className, kind, hidden = false, children }: {
  className: string; kind: 'intro' | 'passage' | 'outro'; hidden?: boolean; children: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    let previousOpacity = ''
    const update = (p: number) => {
      const element = ref.current
      if (!element) return
      const opacity = hidden ? 0 : kind === 'intro' ? Math.max(0, 1 - p / 0.16)
        : kind === 'passage' ? Math.min(1, Math.max(0, (p - 0.18) / 0.04)) * Math.max(0, 1 - (p - 0.28) / 0.055)
        : Math.min(1, Math.max(0, (p - 0.83) / 0.1))
      const value = opacity.toFixed(4)
      if (previousOpacity !== value) { element.style.opacity = value; previousOpacity = value }
      const concealed = opacity < 0.01
      if (element.getAttribute('aria-hidden') !== String(concealed)) {
        element.setAttribute('aria-hidden', String(concealed))
        element.inert = concealed
      }
    }
    update(useScrollStore.getState().scrollProgress)
    return useScrollStore.subscribe(state => update(state.scrollProgress))
  }, [hidden, kind])
  return <section ref={ref} className={className}>{children}</section>
}

export default function AlbumExperience() {
  const inGallery = useScrollStore(state => inArchive(state.scrollProgress))
  const chapter = useScrollStore(state => state.scrollProgress < 0.18 ? 0 : state.scrollProgress < 0.47 ? 1 : state.scrollProgress <= 0.75 ? 2 : 3)
  const showRevisit = useScrollStore(state => state.scrollProgress > 0.91)
  const selected = useAlbumState(state => state.selected)
  const ready = useAlbumState(state => state.ready)
  const hasAssetError = useAlbumState(state => state.assetErrors.length > 0)
  const select = useAlbumState(state => state.select)
  const [indexOpen, setIndexOpen] = useState(false)
  const [creditsOpen, setCreditsOpen] = useState(false)
  const returnButton = useRef<HTMLButtonElement>(null)
  const indexButton = useRef<HTMLButtonElement>(null)
  const moment = selected !== null ? DRIFT_MOMENTS[selected] : null
  const goTo = (value: number) => {
    select(null); setIndexOpen(false)
    const element = document.querySelector<HTMLElement>('[data-scroll-owner="album"]')
    element?.scrollTo({ top: (element.scrollHeight - element.clientHeight) * value, behavior: 'smooth' })
  }

  useEffect(() => {
    if (selected !== null) returnButton.current?.focus({ preventScroll: true })
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (selected !== null || indexOpen || creditsOpen) {
        event.preventDefault()
        event.stopImmediatePropagation()
        select(null); setIndexOpen(false); setCreditsOpen(false)
        indexButton.current?.focus({ preventScroll: true })
      }
    }
    document.addEventListener('keydown', key, true)
    return () => document.removeEventListener('keydown', key, true)
  }, [selected, select, indexOpen, creditsOpen])

  return <div className={`drift-ui${moment ? ' drift-ui--focused' : ''}`} data-album-focused={moment ? 'true' : 'false'} aria-label="The Album — a drifting photo archive">
    {hasAssetError && <p role="status" style={{ position: 'absolute', top: '5rem', left: '5%', right: '5%', whiteSpace: 'normal', fontSize: '0.7rem', color: '#e3e4e5' }}>Some assets couldn’t load. You can continue scrolling or close the album.</p>}
    <ChapterText className="drift-ui__title drift-ui__departure" kind="intro" hidden={!!moment}>
      <p>THE ALBUM</p>
      <h1>A little<br /><i>far from home.</i></h1>
      <span className="drift-ui__note">A little gravity. A lifetime of little things.<br />Scroll into my corner of the universe.</span>
    </ChapterText>
    <ChapterText className="drift-ui__passage" kind="passage">
      <h2>Somewhere<br />between <i>us.</i></h2><span>Let go of everything. Except each other.</span>
    </ChapterText>
    {inGallery && !moment && <div className="drift-ui__gallery-label"><h2>Life, in orbit.</h2><p>Catch a moment. Stay a little.</p></div>}
    <ChapterText className="drift-ui__title drift-ui__afterglow" kind="outro">
      <p>2024—26</p>
      <h1>Far away.<br /><i>Still home.</i></h1>
      <span className="drift-ui__note">Maybe home isn't a place.<br />Maybe it's everything we carry.</span>
      {showRevisit && <button onClick={() => goTo(0.48)}>REVISIT THE ARCHIVE ↗</button>}
    </ChapterText>
    {moment && <section className="drift-ui__caption" aria-live="polite">
      <span>{String(selected! + 1).padStart(2, '0')} / {String(DRIFT_MOMENTS.length).padStart(2, '0')}<i>{moment.meta}</i></span>
      <h2>{moment.title}</h2>
      <button ref={returnButton} onClick={() => { select(null); indexButton.current?.focus() }}>↙ RETURN TO THE WALL</button>
    </section>}
    <footer className="drift-ui__footer">
      <button ref={indexButton} onClick={() => { if (!inGallery) goTo(0.48); else setIndexOpen(!indexOpen); setCreditsOpen(false) }} aria-expanded={indexOpen}>{inGallery ? 'INDEX' : 'THE ARCHIVE'} <span>{indexOpen ? '−' : '↗'}</span></button>
      <p>{!ready ? 'DEVELOPING THE ARCHIVE…' : moment ? 'CLICK TO RETURN · ESC TO CLOSE' : inGallery ? 'SCROLL TO DRIFT · DRAG TO EXPLORE · CLICK TO OPEN' : chapter === 0 ? 'SCROLL TO DESCEND ↓' : chapter === 1 ? 'SCROLL THROUGH THE MEMORY ↓' : 'A LITTLE FURTHER. A LITTLE CLOSER TO HOME.'}</p>
      <button onClick={() => { setCreditsOpen(!creditsOpen); setIndexOpen(false) }} aria-expanded={creditsOpen}>CREDITS</button>
    </footer>
    {indexOpen && inGallery && <nav className="drift-ui__index" aria-label="Select a photograph">
      <p>THE CONTACT SHEET <span>{DRIFT_MOMENTS.length} MOMENTS</span></p>
      {DRIFT_MOMENTS.map((item, index) => <button key={item.src} onClick={() => { select(index); setIndexOpen(false) }}>
        <span>{String(index + 1).padStart(2, '0')}</span>{item.title}<span>↗</span>
      </button>)}
    </nav>}
    {creditsOpen && <aside className="drift-ui__credits">
      <p>SCENE CREDITS</p>
      <span>Photography & direction · Ahmed Hamdy</span>
      <a href="https://sketchfab.com/3d-models/low-poly-crystal-game-ready-asset-b81e123c408a49b5b5becabf64ee44b5" target="_blank" rel="noreferrer">Crystal · Pixel Life ↗</a>
      <a href="https://sketchfab.com/3d-models/dust-particles-glb-db10b96319124df1b70f69625399bb27" target="_blank" rel="noreferrer">Dust · narratify ↗</a>
      <a href="https://sketchfab.com/3d-models/wandering-asteroids-of-andromeda-6a8e84e0fdea43628b8b3ab85b130281" target="_blank" rel="noreferrer">Asteroids · ARCTIC WOLVES™ ↗</a>
      <a href="https://sketchfab.com/3d-models/24-dizzying-space-travel-inktober2019-08ee5e4cabee421ebf0b2cc927d4d6fc" target="_blank" rel="noreferrer">Dizzying space travel · Canary Games · CC BY 4.0 ↗</a>
      <a href="https://sketchfab.com/3d-models/tilt-brush-falling-3882a572ba7a4d81a5556ef595e1e3ef" target="_blank" rel="noreferrer">Tilt Brush — Falling · summerrose · CC BY 4.0 ↗</a>
      <a href="https://sketchfab.com/3d-models/space-boi-f6a8c6a6727b4f2cb020c8b50bb2ee60" target="_blank" rel="noreferrer">Space boi · silvercrow101 · CC BY-NC 4.0 ↗</a>
      <a href="https://sketchfab.com/3d-models/space-ame-camping-amelia-watson-hololive-56ede5352988499d92892fed6061388e" target="_blank" rel="noreferrer">Space Ame Camping · Seafoam · CC BY-NC 4.0 ↗</a>
      <span>Models reframed and relit; textures and animations retained. Asteroid textures resized; crystal and dust materials adapted.</span>
      <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noreferrer">Space boi & Space Ame: non-commercial use only ↗</a>
    </aside>}
  </div>
}

import { AdaptiveDpr, ScrollControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { useThemeStore } from '@/store'
import { useIsMobile } from '@/hooks/use-mobile'
import CameraRig from './CameraRig'
import Hero from './Hero'
import Footer3D from './Footer3D'
import AlbumProfiler from './AlbumProfiler'
import ThemeSwitcher from '@/components/chrome/ThemeSwitcher'
import ScrollHint from '@/components/chrome/ScrollHint'
import { OuterScrollLayer } from './ScrollLayerBridge'
import { useLoadingState } from '@/components/chrome/loadingState'

// Importing this module also starts the portal models' module-level preloads.
// Keep that decoding and portal setup out of the opening scene's critical path.
const ExperienceSection = lazy(() => import('./ExperienceSection'))

function DeferredExperience() {
  const entered = useLoadingState(state => state.phase === 'entered')
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    if (!entered) return
    const idle = window.requestIdleCallback?.(() => setEnabled(true), { timeout: 1500 })
    const timer = idle === undefined ? window.setTimeout(() => setEnabled(true), 250) : undefined
    return () => {
      if (idle !== undefined) window.cancelIdleCallback(idle)
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [entered])
  return enabled ? <Suspense fallback={null}><ExperienceSection /></Suspense> : null
}

function SceneReady() {
  const frames = useRef(0)
  const compiled = useRef(false)
  const gl = useThree(state => state.gl)
  const scene = useThree(state => state.scene)
  const camera = useThree(state => state.camera)
  useEffect(() => {
    let cancelled = false
    compiled.current = false
    frames.current = 0
    // Avoid Preload's synchronous six-view cube render during the HTML intro.
    // Normal scene frames still warm textures and portal render targets.
    void gl.compileAsync(scene, camera).then(() => {
      if (!cancelled) compiled.current = true
    }).catch(error => {
      console.warn('Shader warm-up unavailable; using normal rendered frames.', error)
      if (!cancelled) compiled.current = true
    })
    return () => { cancelled = true }
  }, [gl, scene, camera])
  // This component mounts only after the main scene's Suspense boundary resolves.
  useFrame(() => {
    if (compiled.current && ++frames.current === 3) useLoadingState.setState({ sceneReady: true })
  })
  return null
}

function CanvasReveal({ ready }: { ready: boolean }) {
  const revealing = useLoadingState(state => state.phase !== 'loading')

  useEffect(() => {
    if (!ready || !revealing) return
    const tween = gsap.to('.base-canvas', { opacity: 1, duration: 0.2, overwrite: 'auto' })
    return () => { tween.kill() }
  }, [revealing, ready])

  return null
}

/** The reference app's single canvas and single outer scroll owner. */
export default function Scene({ children }: { children?: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const theme = useThemeStore((state) => state.theme)
  const isMobile = useIsMobile()
  const holdingIntro = useLoadingState(state => state.sceneReady && state.phase === 'loading')

  useEffect(() => {
    if (!wrapperRef.current || !canvasRef.current) return
    gsap.to(wrapperRef.current, { backgroundColor: theme.color, duration: 1 })
    gsap.to(canvasRef.current, { backgroundColor: theme.color, duration: 1 })
  }, [theme.color])

  return (
    <div className="wrapper relative h-[100dvh] w-full">
      <div ref={wrapperRef} className="relative h-[100dvh]" style={{ backgroundColor: theme.color }}>
        <Canvas
          ref={canvasRef}
          className="base-canvas"
          shadows
          frameloop={holdingIntro ? 'demand' : 'always'}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            overflow: 'hidden',
            ...(!isMobile && { inset: '1rem', width: 'calc(100% - 2rem)', height: 'calc(100% - 2rem)' }),
          }}
          dpr={[1, 2]}
          onCreated={() => setReady(true)}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.5} />
            <ScrollControls pages={4} damping={0.3} maxSpeed={1} distance={1} style={{ zIndex: 1 }}>
              <OuterScrollLayer />
              <CameraRig />
              <Hero />
              <DeferredExperience />
              <Footer3D />
              <SceneReady />
            </ScrollControls>
          </Suspense>
          <AdaptiveDpr pixelated />
          <AlbumProfiler />
        </Canvas>
        <CanvasReveal ready={ready} />
      </div>
      <ThemeSwitcher />
      <ScrollHint />
      {children}
    </div>
  )
}

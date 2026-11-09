import { AdaptiveDpr, ScrollControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { lazy, Suspense, useEffect, useRef, useState, startTransition, type ReactNode } from 'react'
import { useThemeStore } from '@/store'
import { useIsMobile } from '@/hooks/use-mobile'
import CameraRig from './CameraRig'
import Hero from './Hero'
import Footer3D from './Footer3D'
import AlbumProfiler from './AlbumProfiler'
import FlowProfiler from './FlowProfiler'
import ThemeSwitcher from '@/components/chrome/ThemeSwitcher'
import ScrollHint from '@/components/chrome/ScrollHint'
import { OuterScrollLayer } from './ScrollLayerBridge'
import { useLoadingState } from '@/components/chrome/loadingState'
import { warmOpening } from './warmOpening'
import { warmPortalPreviews } from '@/components/experience/portalWarmup'

// Importing this module also starts the portal models' module-level preloads.
// Prepare after the hero is ready, but BEFORE unlocking the first scroll.
const ExperienceSection = lazy(() => import('./ExperienceSection'))

function DeferredExperience() {
  const heroReady = useLoadingState(state => state.sceneReady)
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    if (!heroReady) return
    const prepare = () => startTransition(() => setEnabled(true))
    const idle = window.requestIdleCallback?.(prepare, { timeout: 700 })
    const timer = idle === undefined ? window.setTimeout(prepare, 100) : undefined
    return () => {
      if (idle !== undefined) window.cancelIdleCallback(idle)
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [heroReady])
  return enabled ? <Suspense fallback={null}><ExperienceSection /><ExperienceReady /></Suspense> : null
}

function ExperienceReady() {
  const gl = useThree(state => state.gl)
  const scene = useThree(state => state.scene)
  const camera = useThree(state => state.camera)
  useEffect(() => {
    let cancelled = false
    let second = 0
    let third = 0
    const first = requestAnimationFrame(() => {
      void warmOpening(gl, scene, camera, () => cancelled).then(() => warmPortalPreviews(gl, () => cancelled)).catch(error => {
        console.warn('Opening warm-up unavailable; using normal rendering.', error)
      }).finally(() => {
        if (cancelled) return
        second = requestAnimationFrame(() => {
          third = requestAnimationFrame(() => useLoadingState.setState({ experienceReady: true }))
        })
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(first); cancelAnimationFrame(second); cancelAnimationFrame(third)
    }
  }, [gl, scene, camera])
  return null
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
  const holdingIntro = useLoadingState(state => state.sceneReady && state.experienceReady && state.phase === 'loading')

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
          <FlowProfiler />
        </Canvas>
        <CanvasReveal ready={ready} />
      </div>
      <ThemeSwitcher />
      <ScrollHint />
      {children}
    </div>
  )
}

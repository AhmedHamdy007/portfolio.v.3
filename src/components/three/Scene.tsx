import { AdaptiveDpr, Preload, ScrollControls, useProgress } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import gsap from 'gsap'
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { useThemeStore } from '@/store'
import { useIsMobile } from '@/hooks/use-mobile'
import CameraRig from './CameraRig'
import Hero from './Hero'
import ExperienceSection from './ExperienceSection'
import Footer3D from './Footer3D'
import ThemeSwitcher from '@/components/chrome/ThemeSwitcher'
import ScrollHint from '@/components/chrome/ScrollHint'

function CanvasReveal({ ready }: { ready: boolean }) {
  const { progress } = useProgress()

  useEffect(() => {
    if (!ready || progress !== 100) return
    gsap.to('.base-canvas', { opacity: 1, duration: 3, delay: 1, overwrite: 'auto' })
  }, [progress, ready])

  return null
}

/** The reference app's single canvas and single outer scroll owner. */
export default function Scene({ children }: { children?: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const theme = useThemeStore((state) => state.theme)
  const isMobile = useIsMobile()

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
            <ScrollControls pages={4} damping={0.4} maxSpeed={1} distance={1} style={{ zIndex: 1 }}>
              <CameraRig />
              <Hero />
              <ExperienceSection />
              <Footer3D />
            </ScrollControls>
            <Preload all />
          </Suspense>
          <AdaptiveDpr pixelated />
        </Canvas>
        <CanvasReveal ready={ready} />
      </div>
      <ThemeSwitcher />
      <ScrollHint />
      {children}
    </div>
  )
}

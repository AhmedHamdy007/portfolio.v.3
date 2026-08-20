import { Canvas } from '@react-three/fiber'
import {
  AdaptiveDpr,
  Preload,
  ScrollControls,
  useProgress,
} from '@react-three/drei'
import { Bloom, EffectComposer, Noise, SMAA, Vignette } from '@react-three/postprocessing'
import gsap from 'gsap'
import { BlendFunction } from 'postprocessing'
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { useThemeStore } from '@/store'
import { useIsMobile } from '@/hooks/use-mobile'
import CameraRig from './CameraRig'
import Hero from './Hero'
import WindowTunnel from './WindowTunnel'
import ExperienceSection from './ExperienceSection'
import Footer3D from './Footer3D'
import ThemeSwitcher from '@/components/chrome/ThemeSwitcher'
import ScrollHint from '@/components/chrome/ScrollHint'

const NOISE_BG =
  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 600 600\'%3E%3Cfilter id=\'a\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23a)\'/%3E%3C/svg%3E")'

/**
 * White border frame that draws itself while assets load,
 * then stays as the page frame (like the reference site).
 */
function FrameLoader() {
  const { progress } = useProgress()
  const rectRef = useRef<SVGRectElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth - 16, h: window.innerHeight - 16 })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const perimeter = 2 * (size.w + size.h)

  useEffect(() => {
    if (rectRef.current) {
      gsap.to(rectRef.current, {
        strokeDashoffset: perimeter - (perimeter * progress) / 100,
        duration: 0.4,
        ease: 'power1.out',
      })
    }
  }, [progress, perimeter])

  if (!size.w || !size.h) return null

  return (
    <svg
      className="pointer-events-none fixed inset-2 z-40"
      width={size.w}
      height={size.h}
      viewBox={`0 0 ${size.w} ${size.h}`}
      preserveAspectRatio="none"
    >
      <rect
        ref={rectRef}
        x="1"
        y="1"
        width={size.w - 2}
        height={size.h - 2}
        fill="none"
        stroke="#fff"
        strokeWidth="1.5"
        strokeDasharray={perimeter}
        strokeDashoffset={perimeter}
        opacity="0.85"
      />
    </svg>
  )
}

function PostEffects({ isMobile }: { isMobile: boolean }) {
  return (
    <EffectComposer multisampling={isMobile ? 0 : 4}>
      <Bloom
        intensity={isMobile ? 0.28 : 0.42}
        luminanceThreshold={0.82}
        luminanceSmoothing={0.18}
        mipmapBlur={!isMobile}
        radius={0.55}
      />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.18} />
      <Vignette offset={0.18} darkness={0.42} />
      <SMAA />
    </EffectComposer>
  )
}

/** Debug helper: ?scroll=0.5 jumps the scroll container for screenshot testing. */
function ScrollDebug() {
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('scroll')
    if (!p) return
    const t = setTimeout(() => {
      const el = Array.from(document.querySelectorAll<HTMLDivElement>('div')).find(
        (d) =>
          (d.style.overflow === 'scroll' || d.style.overflow === 'auto') &&
          d.scrollHeight > d.clientHeight + 10
      )
      if (el) {
        el.scrollTop = parseFloat(p) * (el.scrollHeight - el.clientHeight)
        el.dispatchEvent(new Event('scroll', { bubbles: true }))
      }
    }, 3500)
    return () => clearTimeout(t)
  }, [])
  return null
}

/** Reveal the canvas once the renderer is up and assets are in. */
function CanvasFader({ ready }: { ready: boolean }) {
  const { progress, active } = useProgress()

  useEffect(() => {
    if (!ready) return
    const reveal = () =>
      gsap.to('.base-canvas', { opacity: 1, duration: 1.5, overwrite: 'auto' })
    if (progress === 100 && !active) {
      reveal()
    } else {
      // Fallback: never leave the canvas hidden if a resource hangs.
      const t = setTimeout(reveal, 5000)
      return () => clearTimeout(t)
    }
  }, [ready, progress, active])
  return null
}

export default function Scene({ children }: { children?: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const themeColor = useThemeStore((s) => s.theme.color)
  const isMobile = useIsMobile()
  const isDesktop = !isMobile
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (wrapperRef.current) {
      gsap.to(wrapperRef.current, { backgroundColor: themeColor, duration: 1 })
    }
  }, [themeColor])

  return (
    <div className="relative h-[100dvh] w-full">
      <div ref={wrapperRef} className="relative h-[100dvh]" style={{ backgroundColor: themeColor }}>
        <Canvas
          className="base-canvas"
          shadows="soft"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            opacity: 0,
            overflow: 'hidden',
            ...(isDesktop && {
              inset: '1rem',
              width: 'calc(100% - 2rem)',
              height: 'calc(100% - 2rem)',
            }),
          }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          camera={{ position: [0, 0, 5], fov: 50 }}
          onCreated={() => setReady(true)}
        >
          <Suspense fallback={null}>
            <fog attach="fog" args={[themeColor, 16, 74]} />
            <ambientLight intensity={0.42} />
            <hemisphereLight color="#ffffff" groundColor="#85bad3" intensity={0.38} />
            <directionalLight
              position={[4, 7, 6]}
              intensity={1.5}
              castShadow
              shadow-mapSize={[1024, 1024]}
              shadow-camera-left={-8}
              shadow-camera-right={8}
              shadow-camera-top={8}
              shadow-camera-bottom={-8}
              shadow-bias={-0.0001}
            />
            <ScrollControls pages={4} damping={0.4} maxSpeed={1} distance={1} style={{ zIndex: 1 }}>
              <CameraRig />
              <Hero />
              <WindowTunnel />
              <ExperienceSection />
              <Footer3D />
            </ScrollControls>
            <PostEffects isMobile={isMobile} />
            <Preload all />
          </Suspense>
          <AdaptiveDpr pixelated />
        </Canvas>

        {/* soft-light film grain over the canvas */}
        <div
          className="pointer-events-none absolute z-30"
          style={{
            inset: isDesktop ? '1rem' : 0,
            backgroundImage: NOISE_BG,
            backgroundRepeat: 'repeat',
            backgroundSize: '100px',
            mixBlendMode: 'soft-light',
          }}
        />
        <CanvasFader ready={ready} />
        <FrameLoader />
        <ScrollDebug />
      </div>
      <ThemeSwitcher />
      <ScrollHint />
      {children}
    </div>
  )
}

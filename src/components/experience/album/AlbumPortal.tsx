import { ScrollControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ChromaticAberrationEffect } from 'postprocessing'
import gsap from 'gsap'
import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePortalStore, useScrollStore } from '@/store'
import { NestedScrollLayer } from '@/components/three/ScrollLayerBridge'
import AlbumAtmosphere from './AlbumAtmosphere'
import AlbumAssetBoundary from './AlbumAssetBoundary'
import DriftingWall, { type AlbumMotion } from './DriftingWall'
import { useAlbumState } from './albumState'
import { journeyBank, journeyPose } from './albumJourney'

const AlbumJourneyScenes = lazy(() => import('./AlbumJourneyScenes'))

const subscribeMotion = (callback: () => void) => {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}
const getMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function AlbumCamera({ mobile, reduced }: { mobile: boolean; reduced: boolean }) {
  const { camera, scene } = useThree()
  const active = usePortalStore(state => state.activePortalId === 'album')
  const entered = useRef(false)
  const entryTimeline = useRef<gsap.core.Timeline | null>(null)
  const closing = usePortalStore(state => state.isClosing)
  useLayoutEffect(() => {
    if (closing) entryTimeline.current?.kill()
  }, [closing])
  const scratch = useMemo(() => ({ position: new THREE.Vector3(), look: new THREE.Vector3(), up: new THREE.Vector3(), matrix: new THREE.Matrix4(), quaternion: new THREE.Quaternion(), bank: new THREE.Quaternion(), axis: new THREE.Vector3(0, 0, 1) }), [])
  useLayoutEffect(() => {
    if (!active) return
    useAlbumState.setState({ entryReady: false })
    entered.current = false
    const initialFov = journeyPose(0, scratch.position, scratch.look)
    if (mobile) scratch.look.setX(scratch.look.x + 3)
    scratch.position.applyMatrix4(scene.matrixWorld)
    scratch.look.applyMatrix4(scene.matrixWorld)
    scratch.up.set(0, 1, 0).transformDirection(scene.matrixWorld)
    scratch.matrix.lookAt(scratch.position, scratch.look, scratch.up)
    scratch.quaternion.setFromRotationMatrix(scratch.matrix)
    scratch.quaternion.multiply(scratch.bank.setFromAxisAngle(scratch.axis, reduced ? 0 : journeyBank(0)))
    const duration = reduced ? 0.25 : 2
    const startPosition = camera.position.clone()
    const startQuaternion = camera.quaternion.clone()
    const entry = { value: 0 }
    const holdTouch = (event: TouchEvent) => { if (!entered.current) event.preventDefault() }
    window.addEventListener('touchmove', holdTouch, { capture: true, passive: false })
    const timeline = gsap.timeline({ onComplete: () => {
      entered.current = true
      useAlbumState.setState({ entryReady: true })
    } })
    entryTimeline.current = timeline
    timeline.to(entry, { value: 1, duration, ease: 'power3.inOut', onUpdate: () => {
      camera.position.lerpVectors(startPosition, scratch.position, entry.value)
      camera.quaternion.slerpQuaternions(startQuaternion, scratch.quaternion, entry.value)
    } }, 0)
      .to(camera, { fov: initialFov + (mobile ? 7 : 0), duration, ease: 'power3.inOut', onUpdate: () => camera.updateProjectionMatrix() }, 0)
    return () => {
      timeline.kill()
      window.removeEventListener('touchmove', holdTouch, true)
      entered.current = false
      useAlbumState.setState({ entryReady: false })
      // GridTile owns the complete animated return, including FOV and bank.
      // Cleanup must not snap the shared camera while that transition runs.
    }
  }, [active, camera, mobile, reduced, scene, scratch])
  useFrame((_, delta) => {
    if (!active || usePortalStore.getState().isClosing || !entered.current || useAlbumState.getState().selected !== null) return
    const progress = useScrollStore.getState().scrollProgress
    const fov = journeyPose(progress, scratch.position, scratch.look) + (mobile ? 7 : 0)
    if (mobile) scratch.look.setX(scratch.look.x + 3 * (1 - THREE.MathUtils.smoothstep(progress, 0, 0.15)))
    scratch.position.applyMatrix4(scene.matrixWorld)
    scratch.look.applyMatrix4(scene.matrixWorld)
    scratch.up.set(0, 1, 0).transformDirection(scene.matrixWorld)
    scratch.matrix.lookAt(scratch.position, scratch.look, scratch.up)
    scratch.quaternion.setFromRotationMatrix(scratch.matrix)
    scratch.quaternion.multiply(scratch.bank.setFromAxisAngle(scratch.axis, reduced ? 0 : journeyBank(progress) * (mobile ? 0.65 : 1)))
    const alpha = 1 - Math.exp(-(reduced ? 10 : 7) * Math.min(delta, 0.05))
    camera.position.lerp(scratch.position, alpha)
    camera.quaternion.slerp(scratch.quaternion, alpha)
    if (camera instanceof THREE.PerspectiveCamera) {
      // R3F cameras are imperative objects owned exclusively by this active rig.
      // eslint-disable-next-line react-hooks/immutability
      camera.fov = THREE.MathUtils.lerp(camera.fov, fov, alpha)
      camera.updateProjectionMatrix()
    }
  }, -0.5)
  return null
}

function AlbumEffects({ mobile, reduced, motion }: { mobile: boolean; reduced: boolean; motion: MutableRefObject<AlbumMotion> }) {
  const chromatic = useMemo(() => new ChromaticAberrationEffect({ offset: new THREE.Vector2(), radialModulation: true, modulationOffset: 0.3 }), [])
  useEffect(() => () => chromatic.dispose(), [chromatic])
  useFrame(() => {
    const amount = reduced || useAlbumState.getState().selected !== null ? 0 : Math.min(Math.abs(motion.current.velocity) * 0.00011, 0.00065)
    chromatic.offset.set(amount * 0.6, amount)
  })
  return <EffectComposer multisampling={0} enableNormalPass={false} renderPriority={2}>
    <Bloom intensity={mobile ? 0.3 : 0.45} luminanceThreshold={1} luminanceSmoothing={0.25} mipmapBlur />
    <primitive object={chromatic} dispose={null} />
    <Vignette offset={0.3} darkness={0.45} />
    <Noise opacity={0.018} blendFunction={BlendFunction.SOFT_LIGHT} />
  </EffectComposer>
}

function AlbumWorld() {
  const mobile = useIsMobile()
  const reduced = useSyncExternalStore(subscribeMotion, getMotion, () => false)
  const active = usePortalStore(state => state.activePortalId === 'album')
  const closing = usePortalStore(state => state.isClosing)
  const entryReady = useAlbumState(state => state.entryReady)
  const motion = useRef<AlbumMotion>({ travel: 0, velocity: 0 })
  const lightTarget = useMemo(() => new THREE.Object3D(), [])
  return <>
    <color attach="background" args={['#030508']} />
    <fog attach="fog" args={['#030508', 16, 75]} />
    <primitive object={lightTarget} position={[0, 0, -12]} />
    <ambientLight color="#e2dece" intensity={0.8} />
    <directionalLight target={lightTarget} position={[7, 12, 10]} color="#ffe3bc" intensity={3.2} />
    <directionalLight target={lightTarget} position={[-12, 4, -30]} color="#8bc8ec" intensity={2.4} />
    <pointLight position={[-3, 3, -3]} color="#8844ff" intensity={0.8} />
    <AlbumAssetBoundary name="Atmosphere"><Suspense fallback={null}><AlbumAtmosphere mobile={mobile} reduced={reduced} /></Suspense></AlbumAssetBoundary>
    <group position={active ? [0, -10, -6.2] : [0, 0, 0]}>
      <AlbumAssetBoundary name="Photographs"><Suspense fallback={null}><DriftingWall mobile={mobile} reduced={reduced} motion={motion} /></Suspense></AlbumAssetBoundary>
    </group>
    {active && <AlbumAssetBoundary name="Journey"><Suspense fallback={null}><AlbumJourneyScenes reduced={reduced} mobile={mobile} /></Suspense></AlbumAssetBoundary>}
    <AlbumCamera mobile={mobile} reduced={reduced} />
    {/* The fullscreen composer must yield to the portal's two-scene exit blend. */}
    {active && entryReady && !closing && <AlbumEffects mobile={mobile} reduced={reduced} motion={motion} />}
  </>
}

export default function AlbumPortal() {
  const active = usePortalStore(state => state.activePortalId === 'album')
  const setScrollProgress = useScrollStore(state => state.setScrollProgress)
  return <ScrollControls pages={6} damping={0.22} maxSpeed={0.6} distance={1}>
    <NestedScrollLayer id="album" active={active} onProgress={setScrollProgress} />
    <AlbumWorld />
  </ScrollControls>
}

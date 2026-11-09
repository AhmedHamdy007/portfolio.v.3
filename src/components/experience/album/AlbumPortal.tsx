import { ScrollControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import * as THREE from 'three'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePortalStore, useScrollStore } from '@/store'
import { NestedScrollLayer } from '@/components/three/ScrollLayerBridge'
import AlbumAssetBoundary from './AlbumAssetBoundary'
import DriftingWall, { type AlbumMotion } from './DriftingWall'
import { useAlbumState } from './albumState'
import { layerCameraBank, layerCameraPose } from './layerJourney'
import MemoryCamera, { MemoryStudio } from './MemoryCamera'
import MemoryChamber from './MemoryChamber'
import OpticalBreach from './OpticalBreach'
import MemoryGrain from './MemoryGrain'
import MemoryLayers from './MemoryLayers'
import MemoryClockwork from './MemoryClockwork'

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
  const preferences = useRef({ mobile, reduced })
  useLayoutEffect(() => { preferences.current = { mobile, reduced } }, [mobile, reduced])
  const closing = usePortalStore(state => state.isClosing)
  useLayoutEffect(() => {
    if (closing) entryTimeline.current?.kill()
  }, [closing])
  const scratch = useMemo(() => ({ position: new THREE.Vector3(), look: new THREE.Vector3(), up: new THREE.Vector3(), matrix: new THREE.Matrix4(), quaternion: new THREE.Quaternion(), bank: new THREE.Quaternion(), axis: new THREE.Vector3(0, 0, 1) }), [])
  useLayoutEffect(() => {
    if (!active) return
    const initialPreferences = preferences.current
    useAlbumState.setState({ entryReady: false })
    entered.current = false
    const initialFov = layerCameraPose(0, scratch.position, scratch.look)
    scratch.position.applyMatrix4(scene.matrixWorld)
    scratch.look.applyMatrix4(scene.matrixWorld)
    scratch.up.set(0, 1, 0).transformDirection(scene.matrixWorld)
    scratch.matrix.lookAt(scratch.position, scratch.look, scratch.up)
    scratch.quaternion.setFromRotationMatrix(scratch.matrix)
    scratch.quaternion.multiply(scratch.bank.setFromAxisAngle(scratch.axis, initialPreferences.reduced ? 0 : layerCameraBank(0)))
    const duration = initialPreferences.reduced ? 0.25 : 2
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
      .to(camera, { fov: initialFov + (initialPreferences.mobile ? 7 : 0), duration, ease: 'power3.inOut', onUpdate: () => camera.updateProjectionMatrix() }, 0)
    return () => {
      timeline.kill()
      window.removeEventListener('touchmove', holdTouch, true)
      entered.current = false
      useAlbumState.setState({ entryReady: false })
      // GridTile owns the complete animated return, including FOV and bank.
      // Cleanup must not snap the shared camera while that transition runs.
    }
  }, [active, camera, scene, scratch])
  useFrame((_, delta) => {
    if (!active || usePortalStore.getState().isClosing || !entered.current || useAlbumState.getState().selected !== null) return
    const progress = useScrollStore.getState().scrollProgress
    const journeyFov = layerCameraPose(progress, scratch.position, scratch.look)
    const fov = (reduced ? 42 : journeyFov) + (mobile ? 7 : 0)
    if (mobile) { scratch.position.setX(scratch.position.x * 0.28); scratch.look.setX(scratch.look.x * 0.28) }
    // Reduced motion keeps a steady, front-facing camera; prints still unfold.
    if (reduced) { scratch.position.set(0, 0.6, 14); scratch.look.set(0, 0, 0) }
    scratch.position.applyMatrix4(scene.matrixWorld)
    scratch.look.applyMatrix4(scene.matrixWorld)
    scratch.up.set(0, 1, 0).transformDirection(scene.matrixWorld)
    scratch.matrix.lookAt(scratch.position, scratch.look, scratch.up)
    scratch.quaternion.setFromRotationMatrix(scratch.matrix)
    scratch.quaternion.multiply(scratch.bank.setFromAxisAngle(scratch.axis, reduced ? 0 : layerCameraBank(progress) * (mobile ? 0.35 : 1)))
    const alpha = 1 - Math.exp(-12 * Math.min(delta, 0.05))
    camera.position.lerp(scratch.position, alpha)
    camera.quaternion.slerp(scratch.quaternion, alpha)
    if (camera instanceof THREE.PerspectiveCamera) {
      // R3F cameras are imperative objects owned exclusively by this active rig.
      const nextFov = THREE.MathUtils.lerp(camera.fov, fov, alpha)
      // eslint-disable-next-line react-hooks/immutability
      if (Math.abs(nextFov - camera.fov) > 0.0001) { camera.fov = nextFov; camera.updateProjectionMatrix() }
    }
  }, -0.5)
  return null
}

function AlbumWorld() {
  const { gl, scene, camera } = useThree()
  const mobile = useIsMobile()
  const reduced = useSyncExternalStore(subscribeMotion, getMotion, () => false)
  const active = usePortalStore(state => state.activePortalId === 'album')
  const closing = usePortalStore(state => state.isClosing)
  const photosReady = useAlbumState(state => state.ready)
  useEffect(() => {
    if (!active || !photosReady || !gl.extensions.has('KHR_parallel_shader_compile')) return
    // Compile hidden chamber/effect variants during the entrance, not at their
    // first scroll boundary. Do not force a synchronous fallback on old GPUs.
    const timer = window.setTimeout(() => {
      void gl.compileAsync(scene, camera).catch(error => console.warn('Album shader warm-up unavailable', error))
    }, 180)
    return () => window.clearTimeout(timer)
  }, [active, photosReady, mobile, reduced, gl, scene, camera])
  useLayoutEffect(() => {
    if (active && closing) useAlbumState.getState().select(null)
  }, [active, closing])
  const motion = useRef<AlbumMotion>({ travel: 0, velocity: 0 })
  return <>
    <color attach="background" args={['#171d1b']} />
    <MemoryStudio />
    <AlbumAssetBoundary name="Memory camera"><Suspense fallback={null}><MemoryCamera mobile={mobile} reduced={reduced} /></Suspense></AlbumAssetBoundary>
    <MemoryGrain mobile={mobile} reduced={reduced} />
    <MemoryChamber mobile={mobile} reduced={reduced} />
    <MemoryLayers mobile={mobile} reduced={reduced} />
    <MemoryClockwork mobile={mobile} reduced={reduced} />
    <group position={active ? [0, 0, 0] : [0, 0, -2]}>
      <AlbumAssetBoundary name="Photographs"><Suspense fallback={null}><DriftingWall mobile={mobile} reduced={reduced} motion={motion} /></Suspense></AlbumAssetBoundary>
    </group>
    <AlbumCamera mobile={mobile} reduced={reduced} />
    <OpticalBreach mobile={mobile} reduced={reduced} />
    {/* No fullscreen composer: portal blending retains sole render ownership. */}
  </>
}

export default function AlbumPortal() {
  const active = usePortalStore(state => state.activePortalId === 'album')
  const setScrollProgress = useScrollStore(state => state.setScrollProgress)
  return <ScrollControls pages={5} damping={0.22} maxSpeed={0.6} distance={1} style={{ overflowY: 'hidden', touchAction: 'none' }}>
    <NestedScrollLayer id="album" active={active} onProgress={setScrollProgress} />
    <AlbumWorld />
  </ScrollControls>
}

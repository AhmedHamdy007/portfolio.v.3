import { useScroll, useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { usePortalFrame as useFrame } from '../portalActivity'
import gsap from 'gsap'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { DRIFT_MOMENTS } from '@/constants/album'
import { usePortalStore, useScrollStore } from '@/store'
import { useAlbumState } from './albumState'
import { photoFragment, photoVertex } from './albumShaders'
import { galleryProgress, unfoldProgress, foldedPrint, inArchive, createRibbonPrint, returnProgress } from './archiveLayout'
import { albumStoryProgress, inMemoryLayer } from './layerJourney'
import MemoryViewer from './MemoryViewer'
import { FOCUS_DEPTH, FOCUS_Y, focusDimensions } from './viewerLayout'

useTexture.preload(DRIFT_MOMENTS.map(moment => moment.src))

export interface AlbumMotion { travel: number; velocity: number }
type MotionRef = MutableRefObject<AlbumMotion>

function FocusVeil() {
  const ref = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>>(null)
  const target = useMemo(() => new THREE.Vector3(), [])
  const facing = useMemo(() => new THREE.Quaternion(), [])
  const { camera, size } = useThree()
  useFrame((_, delta) => {
    const mesh = ref.current
    if (!mesh?.parent) return
    const selected = useAlbumState.getState().selected !== null
    mesh.material.opacity = THREE.MathUtils.damp(mesh.material.opacity, selected ? 0.82 : 0, 5, delta)
    mesh.visible = mesh.material.opacity > 0.001
    if (!mesh.visible) return
    target.set(0, 0, -1.8).applyMatrix4(camera.matrixWorld)
    mesh.parent.worldToLocal(target)
    mesh.position.copy(target)
    mesh.parent.getWorldQuaternion(facing)
    mesh.quaternion.copy(facing.invert()).multiply(camera.quaternion)
    const height = 2 * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov / 2)) * 1.8
    mesh.scale.set(height * size.width / size.height * 1.1, height * 1.1, 1)
  })
  return <mesh ref={ref} renderOrder={10} raycast={() => {}} frustumCulled={false}>
    <planeGeometry />
    <meshBasicMaterial color="#101513" transparent opacity={0} depthTest={false} depthWrite={false} toneMapped={false} />
  </mesh>
}

function Photograph({ index, texture, mobile, reduced, motion, register }: {
  index: number; texture: THREE.Texture; mobile: boolean; reduced: boolean; motion: MotionRef
  register: (index: number, mesh: THREE.Mesh | null) => void
}) {
  const ref = useRef<THREE.Mesh>(null)
  const focus = useRef({ value: 0 })
  const selected = useAlbumState(state => state.selected)
  const isSelected = selected === index
  const { camera, size } = useThree()
  const moment = DRIFT_MOMENTS[index]
  const columns = mobile ? 2 : 4
  const rows = Math.ceil(DRIFT_MOMENTS.length / columns)
  const width = mobile ? 1.7 : 2.15
  const height = moment.aspect >= 1 ? width / moment.aspect : mobile ? 1.9 : 2.3
  const actualWidth = moment.aspect >= 1 ? width : height * moment.aspect
  const geometry = useMemo(() => createRibbonPrint(index, DRIFT_MOMENTS.length, actualWidth, height, mobile), [index, actualWidth, height, mobile])
  useEffect(() => () => geometry.dispose(), [geometry])
  const base = useMemo(() => new THREE.Vector3(), [])
  const target = useMemo(() => new THREE.Vector3(), [])
  const facing = useMemo(() => new THREE.Quaternion(), [])
  const fold = useMemo(() => ({ position: new THREE.Vector3(), rotation: new THREE.Euler(), quaternion: new THREE.Quaternion(), wall: new THREE.Quaternion(), rotationWall: new THREE.Euler(), center: new THREE.Vector3() }), [])
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: photoVertex, fragmentShader: photoFragment,
    uniforms: {
      uMap: { value: texture }, uTime: { value: 0 }, uVelocity: { value: 0 },
      uFocus: { value: 0 }, uPhase: { value: index * 1.7 }, uOpacity: { value: 1 },
      uFold: { value: 1 },
      uGallery: { value: 0 },
      uDevelop: { value: 1 },
      uImageAspect: { value: moment.aspect }, uPlaneAspect: { value: moment.aspect },
    }, transparent: true, side: THREE.DoubleSide, toneMapped: false,
  }), [index, moment.aspect, texture])
  useEffect(() => () => material.dispose(), [material])
  useEffect(() => {
    const tween = gsap.to(focus.current, { value: isSelected ? 1 : 0, duration: reduced ? 0.2 : 1.15, ease: 'power3.inOut', overwrite: true })
    return () => { tween.kill() }
  }, [isSelected, reduced])
  useFrame(({ clock }) => {
    const mesh = ref.current
    if (!mesh || !mesh.parent) return
    const surface = mesh.material as THREE.ShaderMaterial
    const active = usePortalStore.getState().activePortalId === 'album'
    const rawProgress = useScrollStore.getState().scrollProgress
    const progress = active ? albumStoryProgress(rawProgress) : 0.5
    const layerVisibility = active && !reduced ? THREE.MathUtils.smootherstep(rawProgress, 0.64, 0.68) * (1 - THREE.MathUtils.smootherstep(rawProgress, 0.8, 0.84)) : 0
    const unfold = active ? unfoldProgress(progress) : 1
    const reveal = active ? THREE.MathUtils.smootherstep(progress, 0.24, 0.37) * (1 - THREE.MathUtils.smootherstep(progress, 0.918, 0.95)) : 1
    const opacity = selected !== null ? isSelected ? 1 : 0.15 * reveal : reveal
    surface.uniforms.uOpacity.value = opacity
    mesh.visible = opacity > 0.003
    if (!mesh.visible) return
    const column = index % columns
    const row = Math.floor(index / columns)
    const span = rows * 2.65
    const y = THREE.MathUtils.euclideanModulo(row * 2.65 + motion.current.travel + (column % 2) * 0.65 + span / 2, span) - span / 2
    const azimuth = (column - (columns - 1) / 2) * (mobile ? 0.17 : 0.29)
    const x = active ? Math.sin(azimuth) * 10.8 : (column - (columns - 1) / 2) * (mobile ? 1.7 : 2.55)
    const z = -(column % 2) * 0.15 - Math.sin(row * 2.3) * 0.12 - (active && !reduced ? 22 : 0) + (active ? (1 - Math.cos(azimuth)) * 10.8 : 0)
    base.set(x + Math.sin(y * 0.42) * (mobile ? 0.07 : 0.16), y, z)
    foldedPrint(index, DRIFT_MOMENTS.length, mobile, fold.position, fold.rotation)
    const compress = active ? returnProgress(progress) : 0
    const returnDepth = active && !reduced ? 18 : 0
    fold.position.setZ(fold.position.z - returnDepth)
    fold.center.set(mobile ? 0 : 2.7, mobile ? 2.7 : 0, -returnDepth)
    if (!reduced) fold.rotation.set(Math.sin(clock.elapsedTime * 0.16) * 0.06, Math.sin(clock.elapsedTime * 0.12) * 0.13, Math.sin(clock.elapsedTime * 0.13) * 0.035)
    fold.quaternion.setFromEuler(fold.rotation)
    fold.position.sub(fold.center).applyQuaternion(fold.quaternion).add(fold.center)
    if (!reduced) {
      fold.position.sub(fold.center).multiplyScalar(1 - compress * 0.94)
      fold.center.setX(fold.center.x * (1 - compress)).setY(fold.center.y * (1 - compress))
      fold.position.add(fold.center)
    }
    fold.rotationWall.set(Math.sin(y * 0.32) * 0.025, active ? -azimuth : -x * 0.018, Math.sin(index * 3.1) * 0.018)
    fold.wall.setFromEuler(fold.rotationWall)
    const t = active ? focus.current.value : 0
    // Convert camera-relative focus destination into this portal's local space.
    mesh.position.lerpVectors(fold.position, base, unfold)
    const baseScale = reduced ? 1 : 1 - compress * 0.94
    mesh.scale.setScalar(baseScale)
    mesh.quaternion.slerpQuaternions(fold.quaternion, fold.wall, unfold)
    if (t > 0.0001) {
      target.set(0, FOCUS_Y, -FOCUS_DEPTH).applyMatrix4(camera.matrixWorld)
      mesh.parent.worldToLocal(target)
      mesh.position.lerp(target, t)
      const fit = focusDimensions(moment.aspect, size.width / size.height, (camera as THREE.PerspectiveCamera).fov).height / height
      mesh.scale.setScalar(THREE.MathUtils.lerp(baseScale, fit, t))
      mesh.parent.getWorldQuaternion(facing)
      facing.invert().multiply(camera.quaternion)
      mesh.quaternion.slerp(facing, t)
    }
    mesh.renderOrder = t > 0.01 ? 30 : 0
    if (mesh.morphTargetInfluences) mesh.morphTargetInfluences[0] = (1 - unfold) * (1 - t)
    surface.uniforms.uPlaneAspect.value = THREE.MathUtils.lerp(2 * Math.PI * 3.35 / DRIFT_MOMENTS.length / 2.3, moment.aspect, Math.max(unfold, t))
    surface.depthTest = t < 0.01
    surface.uniforms.uTime.value = reduced ? 0 : clock.elapsedTime
    surface.uniforms.uVelocity.value = reduced ? 0 : motion.current.velocity
    surface.uniforms.uFocus.value = t
    surface.uniforms.uFold.value = 1 - unfold
    // The additional viewpoint sees the existing gallery from below. Its
    // normal screen-edge crop must not erase those same photographs overhead.
    surface.uniforms.uGallery.value = active ? unfold * (1 - layerVisibility) : 0
    surface.uniforms.uDevelop.value = !active || reduced ? 1 : THREE.MathUtils.smootherstep(progress, 0.31 + (index % 5) * 0.011, 0.5 + (index % 5) * 0.01)
    // Scroll progress is already damped. A second opacity lag left ghosted
    // rectangles over the vortex, especially when scrolling backward.
    surface.uniforms.uOpacity.value = opacity
    mesh.visible = surface.uniforms.uOpacity.value > 0.003
  })
  return <mesh args={[geometry, material]} ref={node => { ref.current = node; register(index, node) }} userData={{ albumIndex: index }} frustumCulled={false} />
}

export default function DriftingWall({ mobile, reduced, motion }: { mobile: boolean; reduced: boolean; motion: MotionRef }) {
  const textures = useTexture(DRIFT_MOMENTS.map(moment => moment.src))
  const meshes = useRef<Array<THREE.Mesh | null>>([])
  const { camera, gl } = useThree()
  const scroll = useScroll()
  const active = usePortalStore(state => state.activePortalId === 'album')
  const drag = useRef({ down: false, moved: false, startX: 0, startY: 0, lastY: 0, lastTime: 0, velocity: 0, offset: 0, clickedAt: 0 })
  const register = useMemo(() => (index: number, mesh: THREE.Mesh | null) => { meshes.current[index] = mesh }, [])
  useEffect(() => {
    textures.forEach(texture => {
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = Math.min(gl.capabilities.getMaxAnisotropy(), mobile ? 4 : 8)
      texture.needsUpdate = true
    })
    useAlbumState.getState().setReady(true)
    return () => { useAlbumState.getState().setReady(false) }
  }, [gl, mobile, textures])
  useEffect(() => {
    if (!active) return
    const element = scroll.el
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const previousCursor = element.style.cursor
    const dragState = drag.current
    // Drei exposes an imperative DOM scroll element for scoped input handling.
    // eslint-disable-next-line react-hooks/immutability
    element.style.cursor = 'grab'
    const pick = (event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      const objects = meshes.current.filter((mesh): mesh is THREE.Mesh => mesh !== null && mesh.visible)
      const hits = raycaster.intersectObjects(objects, false)
      return hits[0]?.object.userData.albumIndex as number | undefined
    }
    const down = (event: PointerEvent) => {
      if (usePortalStore.getState().isClosing || !useAlbumState.getState().entryReady) return
      if (event.button !== 0) return
      if (!reduced && inMemoryLayer(useScrollStore.getState().scrollProgress) && useAlbumState.getState().selected === null) return
      const state = drag.current
      state.down = true; state.moved = false
      state.startX = event.clientX; state.startY = event.clientY; state.lastY = event.clientY
      state.lastTime = performance.now(); state.velocity = 0
      if (event.pointerType === 'mouse') element.setPointerCapture(event.pointerId)
      element.style.cursor = 'grabbing'
    }
    const move = (event: PointerEvent) => {
      const state = drag.current
      if (!state.down) return
      if (Math.hypot(event.clientX - state.startX, event.clientY - state.startY) > 7) state.moved = true
      const rawProgress = useScrollStore.getState().scrollProgress
      if (!reduced && inMemoryLayer(rawProgress)) {
        state.lastY = event.clientY; state.lastTime = performance.now()
        return
      }
      if (event.pointerType !== 'mouse' || useAlbumState.getState().selected !== null || !inArchive(albumStoryProgress(rawProgress))) return
      const now = performance.now()
      const dy = event.clientY - state.lastY
      state.offset -= dy * 0.008
      state.velocity = THREE.MathUtils.clamp(-dy * 0.008 / Math.max((now - state.lastTime) / 1000, 0.008), -12, 12)
      state.lastY = event.clientY; state.lastTime = now
    }
    const up = (event: PointerEvent) => {
      const state = drag.current
      if (!state.down) return
      state.down = false
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId)
      element.style.cursor = 'grab'
      if (usePortalStore.getState().isClosing) return
      if (!state.moved && performance.now() - state.clickedAt > 350) {
        const selected = useAlbumState.getState().selected
        if (!reduced && selected === null && inMemoryLayer(useScrollStore.getState().scrollProgress)) return
        const index = selected !== null ? null : pick(event)
        if (index !== undefined) { useAlbumState.getState().select(index); state.clickedAt = performance.now() }
      }
    }
    const cancel = () => { drag.current.down = false; drag.current.velocity = 0 }
    element.addEventListener('pointerdown', down)
    element.addEventListener('pointermove', move)
    element.addEventListener('pointerup', up)
    element.addEventListener('pointercancel', cancel)
    return () => {
      element.removeEventListener('pointerdown', down)
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerup', up)
      element.removeEventListener('pointercancel', cancel)
      element.style.cursor = previousCursor
      cancel(); dragState.offset = 0
      useAlbumState.getState().select(null)
    }
  }, [active, camera, gl, scroll, reduced])
  useFrame((_, delta) => {
    const state = drag.current
    const dt = Math.min(delta, 0.05)
    const selected = useAlbumState.getState().selected
    const rawProgress = useScrollStore.getState().scrollProgress
    if (active && !reduced && inMemoryLayer(rawProgress)) {
      // Keep the user's exact gallery arrangement during the added chapter.
      // Stop residual inertia, but retain both travel and the existing offset.
      state.velocity = 0
      Object.assign(motion.current, { velocity: 0 })
      return
    }
    if (!state.down) {
      state.velocity *= Math.exp(-5 * dt)
      if (selected === null) state.offset += state.velocity * dt
    }
    const old = motion.current.travel
    const progress = active ? galleryProgress(albumStoryProgress(rawProgress)) : 0
    const target = progress * (mobile ? 23 : 17) + (active ? state.offset : 0)
    // Shared transient animation state; intentionally outside React rendering.
    Object.assign(motion.current, {
      travel: selected === null ? THREE.MathUtils.damp(old, target, reduced ? 14 : 7, dt) : old,
    })
    Object.assign(motion.current, { velocity: THREE.MathUtils.damp(motion.current.velocity, THREE.MathUtils.clamp((motion.current.travel - old) / Math.max(dt, 0.001), -8, 8), 8, dt) })
  }, -1)
  return <group>
    {textures.map((texture, index) => <Photograph key={DRIFT_MOMENTS[index].src} index={index} texture={texture} mobile={mobile} reduced={reduced} motion={motion} register={register} />)}
    <FocusVeil />
    <MemoryViewer reduced={reduced} />
  </group>
}

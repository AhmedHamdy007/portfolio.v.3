import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { DRIFT_MOMENTS } from '@/constants/album'
import { usePortalStore } from '@/store'
import { useAlbumState } from './albumState'
import { createClockworkGear } from './clockworkGeometry'
import { FOCUS_DEPTH, FOCUS_Y, focusDimensions, frameAdvance } from './viewerLayout'

const NO_PICK = () => {}

function railGeometry() {
  const pieces: THREE.BufferGeometry[] = [new THREE.BoxGeometry(0.026, 1, 0.016)]
  // Raised registration marks catch the existing studio light, without textures.
  for (let i = 0; i < 18; i++) {
    pieces.push(new THREE.BoxGeometry(0.013, 0.006, 0.006).translate(0.018, (i / 17 - 0.5) * 0.92, 0.008))
  }
  const geometry = mergeGeometries(pieces, false)!
  geometry.clearGroups()
  pieces.forEach(piece => piece.dispose())
  return geometry
}

/** Camera-relative object, NOT a camera controller. All input stays with the album. */
export default function MemoryViewer({ reduced }: { reduced: boolean }) {
  const selected = useAlbumState(state => state.selected)
  const root = useRef<THREE.Group>(null)
  const rails = useRef<Array<THREE.Mesh | null>>([])
  const wheels = useRef<Array<THREE.Mesh | null>>([])
  const leaves = useRef<THREE.InstancedMesh>(null)
  const last = useRef<number | null>(null)
  const visual = useRef({ alpha: 0, open: 0, wheel: 0, targetWheel: 0, aspect: 1, width: 0, height: 0 })
  const scratch = useMemo(() => ({ point: new THREE.Vector3(), facing: new THREE.Quaternion(), instance: new THREE.Object3D() }), [])
  const resources = useMemo(() => ({
    rail: railGeometry(), box: new THREE.BoxGeometry(1, 1, 1), gear: createClockworkGear(),
    brass: new THREE.MeshStandardMaterial({ color: '#c7a568', metalness: 0.78, roughness: 0.32, transparent: true, opacity: 0, depthTest: false, depthWrite: false }),
    steel: new THREE.MeshStandardMaterial({ color: '#26352f', metalness: 0.68, roughness: 0.38, transparent: true, opacity: 0, depthTest: false, depthWrite: false }),
  }), [])
  useEffect(() => () => Object.values(resources).forEach(resource => resource.dispose()), [resources])
  useEffect(() => {
    const instance = leaves.current
    instance?.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    return () => { instance?.dispose() }
  }, [])
  useEffect(() => {
    const state = visual.current
    const timeline = gsap.timeline()
    if (selected === null) {
      timeline.to(state, { alpha: 0, duration: reduced ? 0.15 : 0.3, ease: 'power2.out' })
      last.current = null
    } else {
      state.aspect = DRIFT_MOMENTS[selected].aspect
      const entering = last.current === null
      state.targetWheel += (entering ? 1 : frameAdvance(last.current!, selected, DRIFT_MOMENTS.length)) * Math.PI / 8
      last.current = selected
      if (entering) state.open = reduced ? 1 : 0
      timeline.to(state, { alpha: 1, duration: reduced ? 0.15 : 0.5, delay: reduced ? 0 : entering ? 0.35 : 0 }, 0)
      if (!reduced) {
        if (!entering) timeline.to(state, { open: 0, duration: 0.18, ease: 'power2.in' }, 0)
        timeline.to(state, { open: 1, duration: 0.75, ease: 'power3.inOut' }, entering ? 0.6 : 0.4)
        timeline.to(state, { wheel: state.targetWheel, duration: 1.1, ease: 'power3.inOut' }, 0.1)
      } else { state.open = 1; state.wheel = state.targetWheel }
    }
    return () => { timeline.kill() }
  }, [selected, reduced])

  useFrame(({ camera, size }, delta) => {
    const group = root.current
    if (!group?.parent) return
    const portal = usePortalStore.getState()
    const state = visual.current
    group.visible = portal.activePortalId === 'album' && !portal.isClosing && state.alpha > 0.001
    if (!group.visible) return
    const dimensions = focusDimensions(state.aspect, size.width / size.height, (camera as THREE.PerspectiveCamera).fov)
    const dt = Math.min(delta, 0.05)
    state.width = state.width === 0 || reduced ? dimensions.width : THREE.MathUtils.damp(state.width, dimensions.width, 10, dt)
    state.height = state.height === 0 || reduced ? dimensions.height : THREE.MathUtils.damp(state.height, dimensions.height, 10, dt)
    scratch.point.set(0, FOCUS_Y, -FOCUS_DEPTH).applyMatrix4(camera.matrixWorld)
    group.parent.worldToLocal(scratch.point)
    group.position.copy(scratch.point)
    group.parent.getWorldQuaternion(scratch.facing)
    group.quaternion.copy(scratch.facing.invert()).multiply(camera.quaternion)
    resources.brass.setValues({ opacity: state.alpha })
    resources.steel.setValues({ opacity: state.alpha })
    // Keep the image at its original size. The rails sit entirely outside its edges.
    const margin = dimensions.visibleHeight * Math.min(0.012, size.width / size.height * 0.006)
    const detail = Math.min(1, dimensions.visibleHeight * size.width / size.height / 1.1)
    const w = state.width + margin * 2
    const h = state.height + margin * 2
    rails.current.forEach((rail, i) => {
      if (!rail) return
      if (i < 2) {
        rail.position.set((i === 0 ? -1 : 1) * (w / 2 + 0.018 * detail), 0, 0.012)
        rail.scale.set(detail, h + 0.025 * detail, 1)
      } else {
        rail.position.set(0, (i === 2 ? -1 : 1) * (h / 2 + 0.01 * detail), 0)
        rail.scale.set(w + 0.07 * detail, 0.018 * detail, 0.018)
      }
    })
    wheels.current.forEach((wheel, i) => {
      if (!wheel) return
      // One paired advance mechanism, not symmetrical decorative wheels.
      // Different radii turn at inverse speeds, like a film transport.
      wheel.position.set(w / 2 - (i === 0 ? 0.058 : 0.117) * detail, -h / 2 - 0.026 * detail, 0.02)
      wheel.rotation.z = state.wheel * (i === 0 ? 1 : -0.038 / 0.023)
      wheel.scale.setScalar((i === 0 ? 0.038 : 0.023) * detail)
    })
    if (leaves.current) {
      const bladeHeight = h / 6
      for (let i = 0; i < 6; i++) {
        const sign = i < 3 ? -1 : 1
        const parked = sign * (h / 2 + 0.004 + (i % 3) * 0.004)
        const closed = -h / 2 + bladeHeight * (i + 0.5)
        scratch.instance.position.set(0, THREE.MathUtils.lerp(closed, parked, state.open), 0.025 + i * 0.001)
        scratch.instance.scale.set(w, THREE.MathUtils.lerp(bladeHeight + 0.002, 0.005, state.open), 0.002)
        scratch.instance.updateMatrix()
        leaves.current.setMatrixAt(i, scratch.instance.matrix)
      }
      leaves.current.instanceMatrix.needsUpdate = true
    }
  })

  return <group ref={root} visible={false} dispose={null}>
    {[0, 1, 2, 3].map(i => <mesh key={i} ref={node => { rails.current[i] = node }} geometry={i < 2 ? resources.rail : resources.box} material={resources.brass} raycast={NO_PICK} renderOrder={32} frustumCulled={false} />)}
    {[0, 1].map(i => <mesh key={i} ref={node => { wheels.current[i] = node }} geometry={resources.gear} material={resources.brass} raycast={NO_PICK} renderOrder={33} frustumCulled={false} />)}
    <instancedMesh ref={leaves} args={[resources.box, resources.steel, 6]} raycast={NO_PICK} renderOrder={31} frustumCulled={false} />
  </group>
}

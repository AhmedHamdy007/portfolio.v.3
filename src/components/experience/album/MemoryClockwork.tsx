import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { usePortalStore, useScrollStore } from '@/store'
import { useAlbumState } from './albumState'
import { albumStoryProgress } from './layerJourney'
import { createClockworkGeometry, type ClockworkMode } from './clockworkGeometry'

const NO_RAYCAST = () => {}

function Mechanism({ mode, mobile }: { mode: ClockworkMode; mobile: boolean }) {
  const root = useRef<THREE.Group>(null)
  const gearRef = useRef<THREE.InstancedMesh>(null)
  const previousDrive = useRef(Number.NaN)
  const resources = useMemo(() => {
    const material = (color: string, metalness: number, roughness: number) => new THREE.MeshStandardMaterial({ color, metalness, roughness, envMapIntensity: 1.05, transparent: true, opacity: 0, depthWrite: false })
    return {
      ...createClockworkGeometry(mode, mobile),
      materials: [material('#c7a568', 0.78, 0.32), material('#465650', 0.65, 0.43), material('#ba7853', 0.72, 0.37)],
      matrix: new THREE.Matrix4(), rotation: new THREE.Quaternion(), spin: new THREE.Quaternion(), axis: new THREE.Vector3(0, 0, 1), scale: new THREE.Vector3(),
    }
  }, [mobile, mode])
  useLayoutEffect(() => {
    const mesh = gearRef.current
    if (!mesh) return
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    previousDrive.current = Number.NaN
    return () => mesh.dispose()
  }, [resources])
  useEffect(() => () => {
    resources.brass.dispose(); resources.steel.dispose(); resources.copper.dispose(); resources.gear.dispose()
    resources.materials.forEach(material => material.dispose())
  }, [resources])
  useFrame(() => {
    if (!root.current || !gearRef.current) return
    const portal = usePortalStore.getState()
    if (portal.activePortalId === 'album' && portal.isClosing) return
    const raw = useScrollStore.getState().scrollProgress
    const story = albumStoryProgress(raw)
    const smooth = THREE.MathUtils.smootherstep
    const opacity = mode === 'decks'
      ? smooth(raw, 0.64, 0.68) * (1 - smooth(raw, 0.815, 0.86))
      : smooth(story, 0.27, 0.39) * (1 - smooth(story, 0.56, 0.68))
    root.current.visible = portal.activePortalId === 'album' && opacity > 0.002
    if (!root.current.visible) return
    const focused = useAlbumState.getState().selected !== null
    for (const material of resources.materials) {
      // These are owned imperative Three materials, not React render state.
      const alpha = opacity * (focused ? 0.12 : 1)
      Object.assign(material, { opacity: alpha, depthWrite: alpha > 0.995 })
    }
    // One scroll clock drives every spindle. Stop scrolling and the mechanism
    // stops; reversing scroll rewinds it, without frame-rate-dependent drift.
    const drive = mode === 'decks' ? (raw - 0.64) * 8 : story * 5
    if (Math.abs(drive - previousDrive.current) < 0.000001) return
    previousDrive.current = drive
    resources.gears.forEach((gear, index) => {
      resources.rotation.copy(gear.orientation).multiply(resources.spin.setFromAxisAngle(resources.axis, gear.phase + drive * gear.direction / gear.radius))
      resources.scale.setScalar(gear.radius)
      resources.matrix.compose(gear.position, resources.rotation, resources.scale)
      gearRef.current!.setMatrixAt(index, resources.matrix)
    })
    gearRef.current.instanceMatrix.needsUpdate = true
  })
  return <group ref={root} visible={false} dispose={null}>
    <mesh geometry={resources.brass} material={resources.materials[0]} raycast={NO_RAYCAST} />
    <mesh geometry={resources.steel} material={resources.materials[1]} raycast={NO_RAYCAST} />
    <mesh geometry={resources.copper} material={resources.materials[2]} raycast={NO_RAYCAST} />
    <instancedMesh ref={gearRef} args={[resources.gear, resources.materials[0], resources.gears.length]} raycast={NO_RAYCAST} frustumCulled={false} />
  </group>
}

export default function MemoryClockwork({ mobile, reduced }: { mobile: boolean; reduced: boolean }) {
  if (reduced) return null
  return <><Mechanism mode="optical" mobile={mobile} /><Mechanism mode="decks" mobile={mobile} /></>
}

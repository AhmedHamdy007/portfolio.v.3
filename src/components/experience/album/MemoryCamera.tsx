import { Environment, Lightformer, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { usePortalStore, useScrollStore } from '@/store'
import { useAlbumState } from './albumState'
import { albumStoryProgress } from './layerJourney'
import { createCameraMechanics, updateCameraMechanics } from './cameraMechanics'

export const MEMORY_CAMERA_URL = '/models/album/memory-camera.glb'
useGLTF.preload(MEMORY_CAMERA_URL, '/draco/')

/** Original Blender model; no shared cached node or material is animated. */
export default function MemoryCamera({ mobile, reduced }: { mobile: boolean; reduced: boolean }) {
  const { scene } = useGLTF(MEMORY_CAMERA_URL, '/draco/')
  const ref = useRef<THREE.Group>(null)
  const assembly = useMemo(() => {
    const object = scene.clone(true)
    // A newer optional rear cover can remain in the local GLB after reverting
    // the scene. The approved open-backed camera must keep its passage clear.
    const optionalBack = object.getObjectByName('BackDoor')
    if (optionalBack) optionalBack.visible = false
    const materials = new Map<THREE.Material, THREE.MeshStandardMaterial>()
    object.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return
      const clone = (source: THREE.MeshStandardMaterial) => {
        let result = materials.get(source)
        if (!result) { result = source.clone(); materials.set(source, result) }
        if (source.name === 'Coated optics') { result.depthWrite = false; result.transparent = true }
        return result
      }
      child.material = Array.isArray(child.material) ? child.material.map(clone) : clone(child.material)
      child.raycast = () => {}
    })
    const mechanics = createCameraMechanics()
    const barrel = object.getObjectByName('FocusBarrel')
    object.add(mechanics.root)
    ;(barrel ?? object).add(mechanics.barrelRoot)
    return {
      object, mechanics, materials: [...materials.values(), ...Object.values(mechanics.materials)],
      front: object.getObjectByName('FrontRing'), barrel,
      leaves: Array.from({ length: 9 }, (_, i) => object.getObjectByName(`IrisBlade_${String(i).padStart(2, '0')}`)),
      glass: [...materials.values()].find(material => material.name === 'Coated optics'),
    }
  }, [scene])
  useEffect(() => () => {
    const mechanicalMaterials = new Set(Object.values(assembly.mechanics.materials))
    assembly.materials.forEach(material => { if (!mechanicalMaterials.has(material)) material.dispose() })
    assembly.mechanics.dispose()
  }, [assembly])
  useEffect(() => {
    assembly.materials.forEach(material => Object.assign(material, {
      transparent: reduced || material === assembly.glass,
      opacity: material === assembly.glass ? 0.34 : 1,
      needsUpdate: true,
    }))
  }, [assembly, reduced])
  useFrame(({ clock }) => {
    const root = ref.current
    if (!root) return
    const active = usePortalStore.getState().activePortalId === 'album'
    const p = albumStoryProgress(useScrollStore.getState().scrollProgress)
    // The body stays in space behind the camera after the passage. No dissolve.
    root.visible = active && (p < 0.47 || p > 0.86) && useAlbumState.getState().selected === null
    if (!root.visible) return
    const align = reduced ? 0 : THREE.MathUtils.smootherstep(p, 0.02, 0.18)
    const close = THREE.MathUtils.smootherstep(p, 0.955, 0.99)
    const settle = THREE.MathUtils.smootherstep(p, 0.966, 1)
    const open = reduced ? 0 : THREE.MathUtils.smootherstep(p, 0.13, 0.28) * (1 - close)
    const opacity = reduced ? Math.max(1 - THREE.MathUtils.smootherstep(p, 0.22, 0.4), settle) : 1
    if (reduced) assembly.materials.forEach(material => Object.assign(material, { opacity }))
    const breathe = reduced ? 0 : Math.sin(clock.elapsedTime * 0.45) * 0.018 * (1 - align)
    root.position.set((mobile ? 0 : 2.75) * (1 - align) * (1 - settle), (mobile ? 2.7 : 0.1) * (1 - align) * (1 - settle) + breathe + settle * 2.6, 0)
    root.rotation.set(0.16 * (1 - align) + settle * 0.07, -0.4 * (1 - align) - settle * 0.2, -0.16 * (1 - align) + breathe)
    root.scale.setScalar(THREE.MathUtils.lerp(THREE.MathUtils.lerp(mobile ? 0.63 : 1.12, 1.12, align), mobile ? 0.56 : 0.85, settle))
    if (assembly.front) { assembly.front.position.setZ(open * 3.3); assembly.front.rotation.set(0, 0, -open * 0.65) }
    if (assembly.barrel) { assembly.barrel.position.setZ(open * 1.6); assembly.barrel.rotation.set(0, 0, open * 0.38) }
    updateCameraMechanics(assembly.mechanics, open)
    assembly.leaves.forEach((leaf, index) => {
      if (!leaf) return
      // Small deterministic phase offsets imply a mechanical linkage without
      // time-based lag that would desynchronise a reversed scroll.
      const leafOpen = reduced ? 0 : THREE.MathUtils.smootherstep(p, 0.13 + index * 0.002, 0.28) * (1 - close)
      const angle = index / 9 * Math.PI * 2
      leaf.position.set(Math.cos(angle) * leafOpen * 1.3, Math.sin(angle) * leafOpen * 1.3, 0)
      leaf.rotation.z = leafOpen * 0.35
    })
    if (assembly.glass) Object.assign(assembly.glass, { opacity: 0.34 * (1 - open) * opacity })
  })
  return <group ref={ref} dispose={null}><primitive object={assembly.object} /></group>
}

/** A one-frame studio environment, local to the album's portal scene. */
export function MemoryStudio() {
  return <>
    <hemisphereLight args={['#e8e3cc', '#17231e', 1.3]} />
    <directionalLight position={[-4, 7, 8]} color="#fff0d6" intensity={2.2} />
    <directionalLight position={[6, 2, -4]} color="#c0d9d0" intensity={2.2} />
    <Environment resolution={128} frames={1} environmentIntensity={0.9}>
      <Lightformer intensity={5} position={[-5, 6, 5]} scale={[6, 10, 1]} target={[0, 0, 0]} />
      <Lightformer intensity={3} color="#d1e2d7" position={[6, 2, 3]} scale={[3, 9, 1]} target={[0, 0, 0]} />
      <Lightformer intensity={4} color="#e6cf9f" position={[0, 4, -7]} scale={[8, 2, 1]} target={[0, 0, 0]} />
    </Environment>
  </>
}

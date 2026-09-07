import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { usePortalStore, useScrollStore } from '@/store'
import { galleryVisibility } from './albumJourney'

const CRYSTAL = '/models/album/crystal.glb'
const ASTEROIDS = '/models/album/asteroids.glb?v=2'
const DUST = '/models/dust_particles_glb.glb'
;[CRYSTAL, ASTEROIDS, DUST].forEach(path => useGLTF.preload(path))

function normalizedClone(source: THREE.Group, material?: THREE.Material) {
  const clone = source.clone(true)
  clone.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      if (material) object.material = material
      object.raycast = () => {}
      object.castShadow = false
    }
  })
  const box = new THREE.Box3().setFromObject(clone)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const normalizer = 1 / Math.max(size.x, size.y, size.z, 0.001)
  // Normalize a wrapper, never an animated node or the loader's cached scene.
  const centered = new THREE.Group()
  centered.add(clone)
  clone.position.sub(center)
  centered.scale.setScalar(normalizer)
  return centered
}

function CrystalField({ mobile, reduced }: { mobile: boolean; reduced: boolean }) {
  const { scene } = useGLTF(CRYSTAL)
  const root = useRef<THREE.Group>(null)
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1b6973', emissive: '#21c8d5', emissiveIntensity: 0.17,
    roughness: 0.3, metalness: 0.18, flatShading: true, toneMapped: false, transparent: true,
  }), [])
  const model = useMemo(() => normalizedClone(scene, material), [scene, material])
  const copies = useMemo(() => Array.from({ length: mobile ? 4 : 7 }, () => model.clone(true)), [model, mobile])
  useEffect(() => () => material.dispose(), [material])
  useFrame(({ clock }, delta) => {
    if (!root.current) return
    const active = usePortalStore.getState().activePortalId === 'album'
    const visibility = active ? galleryVisibility(useScrollStore.getState().scrollProgress) : 1
    root.current.visible = visibility > 0.002
    material.setValues({ opacity: visibility })
    if (reduced || !active || visibility < 0.002) return
    root.current.children.forEach((child, index) => {
      child.rotation.y += Math.min(delta, 0.05) * 0.12
      child.position.y = Math.sin(index * 2.4) * 4 + Math.sin(clock.elapsedTime * 0.3 + index) * 0.18
    })
  })
  return <group ref={root}>{copies.map((object, i) => (
    <group key={i} position={[(i % 2 ? 1 : -1) * (mobile ? 1.7 + (i % 3) * 0.4 : 2.7 + (i % 3) * 1.7), Math.sin(i * 2.4) * 4, -5 - (i % 3) * 2.4]} rotation={[0.4 + i, i * 0.7, i * 0.4]} scale={0.36 + (i % 3) * 0.17}>
      <primitive object={object} dispose={null} />
    </group>
  ))}</group>
}

function AsteroidCluster({ index, reduced }: { index: number; reduced: boolean }) {
  const { scene, animations } = useGLTF(ASTEROIDS)
  const model = useMemo(() => {
    const clone = normalizedClone(scene)
    clone.traverse(object => {
      if (object instanceof THREE.Mesh) {
        const material = (object.material as THREE.MeshStandardMaterial).clone()
        material.color.multiplyScalar(0.45)
        object.material = material
      }
    })
    return clone
  }, [scene])
  const { actions, mixer } = useAnimations(animations, model)
  const active = usePortalStore(state => state.activePortalId === 'album')
  useEffect(() => {
    Object.values(actions).forEach(action => {
      if (action) {
        action.reset().play()
        action.time = index * 2.3
        action.setEffectiveTimeScale(0.22)
        action.paused = !active || reduced
      }
    })
    return () => { mixer.stopAllAction() }
  }, [actions, active, index, mixer, reduced])
  useEffect(() => () => model.traverse(object => {
    if (object instanceof THREE.Mesh) (object.material as THREE.Material).dispose()
  }), [model])
  const positions: [number, number, number][] = [[-10, 4, -26], [13, -6, -39], [-7, -1, -51]]
  return <group position={positions[index]} scale={[7, 6, 5][index]} rotation={[0, index * 1.5, index * 0.7]}><primitive object={model} dispose={null} /></group>
}

function Dust({ reduced }: { reduced: boolean }) {
  const { scene } = useGLTF(DUST)
  const root = useRef<THREE.Group>(null)
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: '#88ccdd', transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), [])
  const model = useMemo(() => normalizedClone(scene, material), [scene, material])
  useEffect(() => () => material.dispose(), [material])
  useFrame((_, delta) => {
    if (root.current && !reduced && usePortalStore.getState().activePortalId === 'album') root.current.rotation.y += Math.min(delta, 0.05) * 0.018
  })
  return <group ref={root} position={[0, 0, -16]} scale={24}><primitive object={model} dispose={null} /></group>
}

function StarField({ mobile }: { mobile: boolean }) {
  const positions = useMemo(() => {
    const data = new Float32Array((mobile ? 900 : 3000) * 3)
    let seed = 41
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    for (let i = 0; i < data.length; i += 3) {
      data[i] = (random() - 0.5) * 180
      data[i + 1] = (random() - 0.5) * 130
      data[i + 2] = -60 - random() * 80
    }
    return data
  }, [mobile])
  return <points raycast={() => {}}>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
    <pointsMaterial color="#bbc9d9" size={0.05} transparent opacity={0.32} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
  </points>
}

export default function AlbumAtmosphere({ mobile, reduced }: { mobile: boolean; reduced: boolean }) {
  return <>
    <StarField mobile={mobile} />
    {Array.from({ length: mobile ? 1 : 3 }, (_, index) => <AsteroidCluster key={index} index={index} reduced={reduced} />)}
    <Dust reduced={reduced} />
    <group position={[0, -10, -6.2]}><CrystalField mobile={mobile} reduced={reduced} /></group>
  </>
}

import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { usePortalStore, useScrollStore } from '@/store'

const GATE_PATH = '/models/epic_alien_temple_door_animated.glb'

function cloneGate(source: THREE.Group) {
  const clone = source.clone(true)
  clone.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    child.castShadow = true
    child.receiveShadow = true
    child.frustumCulled = false
    child.material = Array.isArray(child.material)
      ? child.material.map((material) => material.clone())
      : child.material.clone()
  })
  return clone
}

export default function MemoryGate() {
  const gateRef = useRef<THREE.Group>(null)
  const entrance = useRef({ value: 0 })
  const actionRef = useRef<THREE.AnimationAction | null>(null)
  const materialsRef = useRef<THREE.Material[]>([])
  const { scene, animations } = useGLTF(GATE_PATH)
  const { gl } = useThree()
  const isActive = usePortalStore((state) => state.activePortalId === 'album')
  const gate = useMemo(() => cloneGate(scene), [scene])
  const mixer = useMemo(() => new THREE.AnimationMixer(gate), [gate])
  const clip = animations[0]
  const clipStart = useMemo(() => {
    if (!clip) return 0
    return clip.tracks.reduce((start, track) => Math.min(start, track.times[0] ?? 0), Number.POSITIVE_INFINITY)
  }, [clip])

  useEffect(() => {
    const anisotropy = Math.min(gl.capabilities.getMaxAnisotropy(), 8)
    const materials = new Set<THREE.Material>()
    gate.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      const meshMaterials = Array.isArray(child.material) ? child.material : [child.material]
      meshMaterials.forEach((material) => {
        materials.add(material)
        if (!(material instanceof THREE.MeshStandardMaterial)) return
        material.envMapIntensity = 0.85
        material.roughness = Math.max(material.roughness, 0.38)
        for (const texture of [material.map, material.normalMap, material.roughnessMap, material.metalnessMap]) {
          if (texture) texture.anisotropy = anisotropy
        }
        material.needsUpdate = true
      })
    })
    materialsRef.current = [...materials]
    return () => { materialsRef.current = [] }
  }, [gate, gl])

  useEffect(() => {
    if (!clip) return
    const activeAction = mixer.clipAction(clip)
    activeAction.reset().setLoop(THREE.LoopOnce, 1).play()
    activeAction.clampWhenFinished = true
    activeAction.paused = true
    actionRef.current = activeAction
    return () => {
      activeAction.stop()
      mixer.stopAllAction()
      actionRef.current = null
    }
  }, [clip, mixer])

  useEffect(() => {
    const tween = gsap.to(entrance.current, {
      value: isActive ? 1 : 0,
      duration: isActive ? 2.6 : 0.9,
      delay: isActive ? 0.2 : 0,
      ease: isActive ? 'power3.inOut' : 'power2.out',
      overwrite: 'auto',
    })
    return () => { tween.kill() }
  }, [isActive])

  useEffect(() => () => {
    gate.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      materials.forEach((material) => material.dispose())
    })
  }, [gate])

  useFrame((_, delta) => {
    const action = actionRef.current
    if (action && clip) {
      action.time = THREE.MathUtils.lerp(clipStart, clip.duration, entrance.current.value)
      mixer.update(0)
    }
    if (gateRef.current) {
      const progress = isActive ? useScrollStore.getState().scrollProgress : 0
      const architectureFade = 1 - THREE.MathUtils.smoothstep(progress, 0.68, 0.83)
      materialsRef.current.forEach((material) => {
        const shouldBlend = architectureFade < 0.995
        if (material.transparent !== shouldBlend) {
          material.transparent = shouldBlend
          material.needsUpdate = true
        }
        material.opacity = THREE.MathUtils.damp(material.opacity, architectureFade, 7, delta)
        material.depthWrite = architectureFade > 0.28
      })
      gateRef.current.rotation.y = THREE.MathUtils.damp(
        gateRef.current.rotation.y,
        isActive ? 0 : Math.sin(performance.now() * 0.00016) * 0.025,
        4,
        delta,
      )
    }
  })

  return (
    <group ref={gateRef} position={[0, 0.65, -0.2]} scale={0.18}>
      <primitive object={gate} />
    </group>
  )
}

useGLTF.preload(GATE_PATH)

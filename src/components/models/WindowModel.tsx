import { useGLTF } from '@react-three/drei'
import { useScroll } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { JSX } from 'react'
import * as THREE from 'three'
import type { GLTF } from 'three-stdlib'
import '@/lib/portfolio-assets'
import { usePortalStore } from '@/store'
import { useLoadingState } from '@/components/chrome/loadingState'
import { createThresholdLight, updateThresholdLight } from './thresholdLight'

type WindowResult = GLTF & {
  nodes: {
    '#WIN0003_Frame_#WIN0003_Textures_0': THREE.Mesh
    '#WIN0003_Window_#WIN0003_Textures_0': THREE.Mesh
    '#WIN0003_Handle_#WIN0003_Textures_0': THREE.Mesh
  }
  materials: { WIN0003_Textures: THREE.MeshPhysicalMaterial }
}

export default function WindowModel(props: JSX.IntrinsicElements['group']) {
  const handleRef = useRef<THREE.Mesh>(null)
  const windowRef = useRef<THREE.Mesh>(null)
  const data = useScroll()
  const { nodes, materials } = useGLTF('/models/window.glb', true) as unknown as WindowResult
  const threshold = useMemo(() => createThresholdLight(materials.WIN0003_Textures), [materials.WIN0003_Textures])
  useEffect(() => () => threshold.dispose(), [threshold])

  useFrame(({ camera }) => {
    const b = data.range(0.4, 0.1)
    const c = data.range(0.5, 0.1)
    if (handleRef.current) handleRef.current.rotation.y = -0.5 * Math.PI * b
    if (windowRef.current) windowRef.current.rotation.z = 0.5 * Math.PI * c
    updateThresholdLight(threshold, data.offset, camera.position.y, 0.5 * Math.PI * c, b,
      !!usePortalStore.getState().activePortalId, useLoadingState.getState().phase === 'loading')
  })

  return (
    <group {...props} dispose={null}>
      <primitive object={threshold.mesh} />
      <group rotation={[0, Math.PI, Math.PI]}>
        <mesh castShadow receiveShadow geometry={nodes['#WIN0003_Frame_#WIN0003_Textures_0'].geometry} material={threshold.frame} />
        <group position={[0.441, -0.039, 0.082]} ref={windowRef}>
          <mesh castShadow receiveShadow geometry={nodes['#WIN0003_Window_#WIN0003_Textures_0'].geometry} material={materials.WIN0003_Textures} />
          <mesh ref={handleRef} castShadow receiveShadow geometry={nodes['#WIN0003_Handle_#WIN0003_Textures_0'].geometry} material={threshold.handle} position={[-0.84, -0.018, 0.55]} />
        </group>
      </group>
    </group>
  )
}

useGLTF.preload('/models/window.glb', true)

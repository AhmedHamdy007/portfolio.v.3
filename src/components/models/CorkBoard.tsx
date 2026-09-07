import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { JSX } from 'react'
import type { GLTF } from 'three-stdlib'
import '@/lib/portfolio-assets'

type CorkBoardResult = GLTF & {
  nodes: Record<string, THREE.Mesh>
  materials: Record<string, THREE.Material>
  scene: THREE.Group
}

useGLTF.preload('/models/psx_-_corkevidence_board_2.glb')

export function CorkBoard(props: JSX.IntrinsicElements['group']) {
  const { scene } = useGLTF('/models/psx_-_corkevidence_board_2.glb', true) as unknown as CorkBoardResult

  return (
    <group {...props} dispose={null}>
      <primitive object={scene.clone()} />
    </group>
  )
}

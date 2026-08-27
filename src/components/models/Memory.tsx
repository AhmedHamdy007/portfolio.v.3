import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { JSX } from 'react'
import type { GLTF } from 'three-stdlib'
import '@/lib/portfolio-assets'

type MemoryResult = GLTF & {
  nodes: {
    'Extract2_04_-_Default_0': THREE.Mesh
    Cylinder006_Ceramic_0: THREE.Mesh
    'Box001_05_-_Default_0': THREE.Mesh
    'Line005_02_-_Default_0': THREE.Mesh
    'Cylinder003_01_-_Default_0': THREE.Mesh
    'Sphere003_03_-_Default_0': THREE.Mesh
    'Line004_16_-_Matte_Plastic_0': THREE.Mesh
    Cylinder007_Ceramic1_0: THREE.Mesh
  }
  materials: Record<string, THREE.Material>
}

export function Memory(props: JSX.IntrinsicElements['group']) {
  const { nodes, materials } = useGLTF('/models/dalithe_persistence_of_memory.glb', true) as unknown as MemoryResult
  const nodeMap = nodes as Record<string, THREE.Mesh>
  const getNode = (name: string) => {
    const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_')
    return nodeMap[name] ?? nodeMap[sanitized] ?? Object.values(nodeMap).find((node) => node.name === name || node.name === sanitized)
  }
  const getMaterial = (name: string) => materials[name] ?? materials[name.replace(/[^a-zA-Z0-9_]/g, '_')]
  const extract = getNode('Extract2_04_-_Default_0')
  const cylinder006 = getNode('Cylinder006_Ceramic_0')
  const box = getNode('Box001_05_-_Default_0')
  const line005 = getNode('Line005_02_-_Default_0')
  const cylinder003 = getNode('Cylinder003_01_-_Default_0')
  const sphere = getNode('Sphere003_03_-_Default_0')
  const line004 = getNode('Line004_16_-_Matte_Plastic_0')
  const cylinder007 = getNode('Cylinder007_Ceramic1_0')
  if (!extract || !cylinder006 || !box || !line005 || !cylinder003 || !sphere || !line004 || !cylinder007) return null
  return (
    <group {...props} dispose={null}>
      <mesh castShadow receiveShadow geometry={extract.geometry} material={getMaterial('04_-_Default')} scale={0.021} />
      <mesh castShadow receiveShadow geometry={cylinder006.geometry} material={getMaterial('Ceramic')} position={[0.541, 0, 2.543]} rotation={[-Math.PI / 2, 0, 0]} scale={0.021} />
      <mesh castShadow receiveShadow geometry={box.geometry} material={getMaterial('05_-_Default')} scale={0.021} />
      <mesh castShadow receiveShadow geometry={line005.geometry} material={getMaterial('02_-_Default')} position={[0, 0.005, 0]} scale={0.021} />
      <mesh castShadow receiveShadow geometry={cylinder003.geometry} material={getMaterial('01_-_Default')} position={[-0.584, 0.659, -1.595]} scale={0.021} />
      <mesh castShadow receiveShadow geometry={sphere.geometry} material={getMaterial('03_-_Default')} position={[-0.901, 0.331, -1.311]} rotation={[-Math.PI / 2, 0, 0]} scale={0.021} />
      <mesh castShadow receiveShadow geometry={line004.geometry} material={getMaterial('16_-_Matte_Plastic')} rotation={[-Math.PI / 2, 0, 0]} scale={0.021} />
      <mesh castShadow receiveShadow geometry={cylinder007.geometry} material={getMaterial('Ceramic1')} position={[0.541, 0, 2.543]} rotation={[-Math.PI / 2, 0, 0]} scale={0.022} />
    </group>
  )
}

useGLTF.preload('/models/dalithe_persistence_of_memory.glb', true)

import { useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { ALBUM_MOMENTS } from '@/constants/album'
import { usePortalStore, useScrollStore } from '@/store'

const FRAME_LAYOUT = [
  { position: [-0.66, 0.22, -3.2], rotation: [0.015, 0.16, -0.025], at: 0.32 },
  { position: [0.67, -0.08, -4.08], rotation: [-0.02, -0.17, 0.02], at: 0.42 },
  { position: [-0.62, 0.28, -4.95], rotation: [0.02, 0.14, -0.018], at: 0.52 },
  { position: [0.63, -0.12, -5.8], rotation: [-0.015, -0.14, 0.024], at: 0.62 },
  { position: [-0.56, 0.24, -6.62], rotation: [0.01, 0.12, -0.016], at: 0.71 },
  { position: [0.52, -0.08, -7.38], rotation: [-0.01, -0.12, 0.018], at: 0.78 },
] as const

export default function MemoryFrames() {
  const textures = useTexture(ALBUM_MOMENTS.map((moment) => moment.src))
  const groups = useRef<Array<THREE.Group | null>>([])
  const imageMaterials = useRef<Array<THREE.MeshBasicMaterial | null>>([])
  const frameMaterials = useRef<Array<THREE.MeshStandardMaterial | null>>([])
  const { gl } = useThree()
  const isActive = usePortalStore((state) => state.activePortalId === 'album')

  useEffect(() => {
    const anisotropy = Math.min(gl.capabilities.getMaxAnisotropy(), 8)
    textures.forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = anisotropy
      texture.minFilter = THREE.LinearMipmapLinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.needsUpdate = true
    })
  }, [gl, textures])

  useFrame((state, delta) => {
    const progress = isActive ? useScrollStore.getState().scrollProgress : 0
    FRAME_LAYOUT.forEach((layout, index) => {
      const group = groups.current[index]
      const imageMaterial = imageMaterials.current[index]
      const frameMaterial = frameMaterials.current[index]
      if (!group || !imageMaterial || !frameMaterial) return

      const enter = THREE.MathUtils.smoothstep(progress, layout.at - 0.085, layout.at - 0.015)
      const leave = THREE.MathUtils.smoothstep(progress, layout.at + 0.08, layout.at + 0.18)
      const visibility = isActive ? enter * (1 - leave) : 0
      const targetScale = 0.84 + visibility * 0.16

      imageMaterial.opacity = THREE.MathUtils.damp(imageMaterial.opacity, visibility, 8, delta)
      frameMaterial.opacity = THREE.MathUtils.damp(frameMaterial.opacity, visibility * 0.72, 8, delta)
      group.scale.x = THREE.MathUtils.damp(group.scale.x, targetScale, 7, delta)
      group.scale.y = THREE.MathUtils.damp(group.scale.y, targetScale, 7, delta)
      group.scale.z = THREE.MathUtils.damp(group.scale.z, targetScale, 7, delta)
      group.position.y = layout.position[1] + Math.sin(state.clock.elapsedTime * 0.55 + index * 0.8) * 0.012 * visibility
    })
  })

  return (
    <group>
      {ALBUM_MOMENTS.map((moment, index) => {
        const layout = FRAME_LAYOUT[index]
        const height = moment.aspect >= 1 ? 0.68 : 0.9
        const width = height * moment.aspect
        return (
          <group
            key={moment.src}
            ref={(node) => { groups.current[index] = node }}
            position={layout.position}
            rotation={layout.rotation}
            scale={0.84}
          >
            <mesh position={[0, 0, -0.018]}>
              <planeGeometry args={[width + 0.065, height + 0.065]} />
              <meshStandardMaterial
                ref={(material) => { frameMaterials.current[index] = material }}
                color="#e7e0d3"
                emissive="#152342"
                emissiveIntensity={0.22}
                roughness={0.72}
                metalness={0.18}
                transparent
                opacity={0}
                depthWrite={false}
              />
            </mesh>
            <mesh>
              <planeGeometry args={[width, height]} />
              <meshBasicMaterial
                ref={(material) => { imageMaterials.current[index] = material }}
                map={textures[index]}
                color="#ffffff"
                side={THREE.DoubleSide}
                transparent
                opacity={0}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

useTexture.preload(ALBUM_MOMENTS.map((moment) => moment.src))

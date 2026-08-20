import { Text, useScroll } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { FONTS } from '@/store'

const WORDS = [
  'FRONTEND ENGINEER',
  'DESIGNER. DEVELOPER',
  'CREATIVE. OPTIMIST',
  'DREAMER. BUILDER',
]

const RING_GAP = 3.2
const RING_COUNT = 11
const RING_START = -9.5
const HALF = 3.4
const WINDOW_Z = 5.65

/**
 * The "text window" from the reference: as the camera tilts down
 * and descends, it passes through a corridor of huge mirrored serif
 * words receding to a vanishing point — plus a floating window frame
 * that swings open as you approach.
 */
export default function WindowTunnel() {
  const data = useScroll()
  const frameRef = useRef<THREE.Group>(null)

  const rings = useMemo(() => {
    return Array.from({ length: RING_COUNT }, (_, i) => {
      const y = RING_START - i * RING_GAP
      return { y, wordOffset: i % WORDS.length, flip: i % 2 === 0 }
    })
  }, [])

  useFrame(() => {
    const c = data.range(0.55, 0.2)
    if (frameRef.current) {
      frameRef.current.rotation.y = 0.35 * Math.PI * c
      frameRef.current.position.y = -25 + 1.2 * c
      frameRef.current.position.z = WINDOW_Z - 0.6 * c
    }
  })

  return (
    <>
      {/* Corridor of words wrapping the descent path */}
      {rings.map((ring, i) => (
        <group key={i} position={[0, ring.y, WINDOW_Z - 0.8]}>
          {/* left wall, facing +x */}
          <Text
            position={[-HALF, 0, 0]}
            rotation={[0, Math.PI / 2, -Math.PI / 2]}
            scale={ring.flip ? [1, -1, 1] : [-1, -1, 1]}
            font={FONTS.serif}
            fontSize={1.05}
            color="white"
            anchorX="center"
            anchorY="middle"
            fillOpacity={0.92}
          >
            {WORDS[ring.wordOffset]}
          </Text>
          {/* right wall, facing -x */}
          <Text
            position={[HALF, 0, 0]}
            rotation={[0, -Math.PI / 2, -Math.PI / 2]}
            scale={ring.flip ? [-1, -1, 1] : [1, -1, 1]}
            font={FONTS.serif}
            fontSize={1.05}
            color="white"
            anchorX="center"
            anchorY="middle"
            fillOpacity={0.92}
          >
            {WORDS[(ring.wordOffset + 1) % WORDS.length]}
          </Text>
          {/* near wall, facing +z */}
          <Text
            position={[0, 0, -HALF]}
            rotation={[0, 0, -Math.PI / 2]}
            scale={ring.flip ? [1, -1, 1] : [-1, -1, 1]}
            font={FONTS.serif}
            fontSize={1.05}
            color="white"
            anchorX="center"
            anchorY="middle"
            fillOpacity={0.92}
          >
            {WORDS[(ring.wordOffset + 2) % WORDS.length]}
          </Text>
          {/* far wall, facing -z */}
          <Text
            position={[0, 0, HALF]}
            rotation={[0, Math.PI, -Math.PI / 2]}
            scale={ring.flip ? [-1, -1, 1] : [1, -1, 1]}
            font={FONTS.serif}
            fontSize={1.05}
            color="white"
            anchorX="center"
            anchorY="middle"
            fillOpacity={0.92}
          >
            {WORDS[(ring.wordOffset + 3) % WORDS.length]}
          </Text>
        </group>
      ))}

      {/* Window frame the camera falls through */}
      <group ref={frameRef} position={[0, -25, WINDOW_Z]}>
        <mesh position={[0, 0, 2.55]}>
          <boxGeometry args={[5.5, 0.22, 0.42]} />
          <meshStandardMaterial color="#f5f3ec" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, -2.55]}>
          <boxGeometry args={[5.5, 0.22, 0.42]} />
          <meshStandardMaterial color="#f5f3ec" roughness={0.6} />
        </mesh>
        <mesh position={[2.55, 0, 0]}>
          <boxGeometry args={[0.42, 0.22, 5.5]} />
          <meshStandardMaterial color="#f5f3ec" roughness={0.6} />
        </mesh>
        <mesh position={[-2.55, 0, 0]}>
          <boxGeometry args={[0.42, 0.22, 5.5]} />
          <meshStandardMaterial color="#f5f3ec" roughness={0.6} />
        </mesh>
        {/* cross muntins */}
        <mesh>
          <boxGeometry args={[5.1, 0.14, 0.12]} />
          <meshStandardMaterial color="#f5f3ec" roughness={0.6} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[5.1, 0.14, 0.12]} />
          <meshStandardMaterial color="#f5f3ec" roughness={0.6} />
        </mesh>
      </group>
    </>
  )
}

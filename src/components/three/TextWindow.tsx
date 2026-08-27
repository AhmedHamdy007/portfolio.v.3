import { Text, useScroll } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { FONTS } from '@/store'

/** Reference text choreography attached to the window descent. */
export default function TextWindow() {
  const data = useScroll()
  const windowRef = useRef<THREE.Group>(null)

  useFrame(() => {
    const c = data.range(0.65, 0.15)
    if (!windowRef.current) return
    windowRef.current.setRotationFromAxisAngle(new THREE.Vector3(0, -1, 0), 0.5 * Math.PI * c)
    windowRef.current.position.x = -0.6 * c
    windowRef.current.position.z = -0.6 * c
  })

  return (
    <group ref={windowRef} position={[0, -0.3, 0]}>
      <Text color="white" anchorX="left" anchorY="middle" fontSize={1.3} position={[0.12, 0, 0]} font={FONTS.serif} scale={[1, -1, 1]} rotation={[0, 0, -Math.PI / 2]}>
        FRONTEND ENGINEER
      </Text>
      <Text color="white" anchorX="right" anchorY="middle" font={FONTS.serif} scale={[-1, -1, 1]} fontSize={1.3} position={[0.12, 0, -1.4]} rotation={[0, 0, -Math.PI / 2]}>
        DESIGNER. DEVELOPER
      </Text>
      <group position={[-0.45, 0, -0.3]}>
        <Text color="white" anchorX="left" anchorY="middle" font={FONTS.serif} scale={[1, -1, 1]} fontSize={0.8} rotation={[0, -Math.PI / 2, -Math.PI / 2]}>
          DESIGNER. DUMBASS.
        </Text>
        <Text color="white" anchorX="left" anchorY="middle" font={FONTS.serif} scale={[1, -1, 1]} fontSize={0.8} position={[0, 0, -0.6]} rotation={[0, -Math.PI / 2, -Math.PI / 2]}>
          DJ. MELOMANIAC
        </Text>
      </group>
      <group position={[0.45, 0, -0.3]}>
        <Text color="white" anchorX="right" anchorY="middle" font={FONTS.serif} scale={[-1, -1, 1]} fontSize={0.8} rotation={[0, -Math.PI / 2, -Math.PI / 2]}>
          GAMER. CREATIVE
        </Text>
        <Text color="white" anchorX="right" anchorY="middle" font={FONTS.serif} scale={[-1, -1, 1]} fontSize={0.8} position={[0, 0, -0.6]} rotation={[0, -Math.PI / 2, -Math.PI / 2]}>
          CREATIVE. OPTIMIST
        </Text>
      </group>
    </group>
  )
}

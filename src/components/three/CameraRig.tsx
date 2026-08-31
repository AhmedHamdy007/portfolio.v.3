import { useFrame, useThree } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import * as THREE from 'three'
import { usePortalStore, useScrollStore } from '@/store'
import { useIsMobile } from '@/hooks/use-mobile'

/**
 * Replicates the reference site's camera choreography:
 * tilt straight down during the first 30% of scroll,
 * descend through the world from 30–50%,
 * and pull back at the very end. Subtle mouse parallax on top.
 */
export default function CameraRig() {
  const { camera } = useThree()
  const data = useScroll()
  const isPortalActive = usePortalStore((s) => !!s.activePortalId)
  const setScrollProgress = useScrollStore((s) => s.setScrollProgress)
  const isMobile = useIsMobile()

  useFrame((state, delta) => {
    if (!data) return
    const a = data.range(0, 0.3)
    const b = data.range(0.3, 0.5)
    const d = data.range(0.85, 0.18)

    if (!isPortalActive) {
      // Three cameras are mutable scene objects; this is intentionally inside
      // the render loop rather than React state.
      // eslint-disable-next-line react-hooks/immutability
      camera.rotation.x = THREE.MathUtils.damp(
        camera.rotation.x,
        -0.5 * Math.PI * a,
        5,
        delta
      )
      camera.position.y = THREE.MathUtils.damp(camera.position.y, -37 * b, 7, delta)
      camera.position.z = THREE.MathUtils.damp(camera.position.z, 5 + 10 * d, 7, delta)
      camera.position.x = THREE.MathUtils.damp(camera.position.x, 0, 7, delta)
      camera.rotation.y = THREE.MathUtils.damp(camera.rotation.y, 0, 7, delta)
      setScrollProgress(data.range(0, 1))
    }

    if (!isMobile && !isPortalActive) {
      camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, -(state.pointer.x * Math.PI) / 90, 0.05)
    }
  })

  return null
}

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'

/** Reference mobile project camera pan with the original .05 damping. */
export default function TouchPanControls() {
  const { camera } = useThree()
  const touchStart = useRef({ x: 0, y: 0 })
  const cameraRotation = useRef({ x: 0, y: 0 })
  const targetRotation = useRef({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    cameraRotation.current = { x: camera.rotation.y, y: camera.rotation.x }
    targetRotation.current = { x: camera.rotation.y, y: camera.rotation.x }
  }, [camera])

  useFrame(() => {
    // eslint-disable-next-line react-hooks/immutability
    camera.rotation.y += (targetRotation.current.x - camera.rotation.y) * 0.05
    camera.rotation.x += (targetRotation.current.y - camera.rotation.x) * 0.05
    camera.updateProjectionMatrix()
  })

  useEffect(() => {
    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return
      setDragging(true)
      touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }
      cameraRotation.current = { x: targetRotation.current.x, y: targetRotation.current.y }
    }
    const onMove = (event: TouchEvent) => {
      if (!dragging || event.touches.length !== 1) return
      const deltaX = event.touches[0].clientX - touchStart.current.x
      const next = cameraRotation.current.x + deltaX * 0.005
      targetRotation.current.x = Math.max(Math.min(next, Math.PI / 3), -Math.PI / 3)
    }
    const onEnd = () => setDragging(false)
    document.addEventListener('touchstart', onStart, { passive: false })
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }
  }, [dragging])

  return null
}

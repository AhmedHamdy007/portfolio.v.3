import { useScroll } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePortalStore } from '@/store'
import { Wanderer } from '@/components/models/Wanderer'
import ProjectsCarousel from './ProjectsCarousel'
import TouchPanControls from './TouchPanControls'

export default function ProjectsPortal() {
  const { camera, gl } = useThree()
  const pointer = useRef({ x: 0, y: 0 })
  const isActive = usePortalStore((state) => state.activePortalId === 'projects')
  const isClosing = usePortalStore(state => state.isClosing)
  const data = useScroll()
  const isMobile = useIsMobile()
  useEffect(() => {
    if (!isActive || isClosing || isMobile) return
    const trackedPointer = pointer.current
    // Portal event layers can hold a stale R3F pointer after an album visit.
    // Track the visible canvas directly, only while Projects owns the camera.
    const followPointer = (event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      trackedPointer.x = THREE.MathUtils.clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1)
      trackedPointer.y = THREE.MathUtils.clamp(1 - (event.clientY - rect.top) / rect.height * 2, -1, 1)
    }
    window.addEventListener('pointermove', followPointer, { passive: true })
    return () => {
      window.removeEventListener('pointermove', followPointer)
      trackedPointer.x = 0; trackedPointer.y = 0
    }
  }, [gl, isActive, isClosing, isMobile])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    if (data?.el) data.el.style.overflow = isActive ? 'hidden' : 'auto'
    if (isActive && !isClosing) {
      const tween = gsap.to(camera.position, { ...(isMobile ? { z: 11.5, y: -39, x: 1 } : { y: -39, x: 2 }), duration: 1, overwrite: 'auto' })
      return () => { tween.kill() }
    }
  }, [camera, data, isActive, isMobile, isClosing])

  useFrame((_, delta) => {
    if (!isActive || isMobile || usePortalStore.getState().isClosing) return
    // eslint-disable-next-line react-hooks/immutability
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, -(pointer.current.x * Math.PI) / 4, 1 - Math.pow(0.97, Math.min(delta, 0.05) * 60))
    camera.position.z = THREE.MathUtils.damp(camera.position.z, 11.5 - pointer.current.y, 7, delta)
  })

  return (
    <group>
      <Wanderer rotation={new THREE.Euler(0, Math.PI / 6, 0)} scale={new THREE.Vector3(1.5, 1.5, 1.5)} position={new THREE.Vector3(0, -1, -1)} />
      <ProjectsCarousel />
      {isActive && !isClosing && isMobile && <TouchPanControls />}
    </group>
  )
}

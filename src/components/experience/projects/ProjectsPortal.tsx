import { useScroll } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect } from 'react'
import * as THREE from 'three'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePortalStore } from '@/store'
import { PROJECTS } from '@/constants'
import { Wanderer } from '@/components/models/Wanderer'
import ProjectsCarousel from './ProjectsCarousel'
import TouchPanControls from './TouchPanControls'

export default function ProjectsPortal() {
  const { camera } = useThree()
  const isActive = usePortalStore((state) => state.activePortalId === 'projects')
  const data = useScroll()
  const isMobile = useIsMobile()
  const compactProjectLayout = PROJECTS.length <= 2

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    if (data?.el) data.el.style.overflow = isActive ? 'hidden' : 'auto'
    if (isActive) {
      if (isMobile) {
        gsap.to(camera.position, { z: 11.5, y: -39, x: 1, duration: 1, overwrite: 'auto' })
      } else {
        gsap.to(camera.position, { y: -39, x: 2, duration: 1, overwrite: 'auto' })
      }
    }
  }, [camera, data, isActive, isMobile])

  useFrame((state, delta) => {
    if (!isActive || isMobile) return
    // eslint-disable-next-line react-hooks/immutability
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, -(state.pointer.x * Math.PI) / 4, 0.03)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, 11.5 - state.pointer.y, 7, delta)
  })

  return (
    <group>
      <Wanderer rotation={new THREE.Euler(0, Math.PI / 6, 0)} scale={new THREE.Vector3(1.5, 1.5, 1.5)} position={new THREE.Vector3(0, -1, -1)} />
      <ProjectsCarousel />
      {isActive && isMobile && <TouchPanControls />}
    </group>
  )
}

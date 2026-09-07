import { Text, useScroll } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePortalStore, FONTS } from '@/store'
import GridTile from '@/components/experience/GridTile'
import WorkPortal from '@/components/experience/work/WorkPortal'
import ProjectsPortal from '@/components/experience/projects/ProjectsPortal'
import AlbumPortal from '@/components/experience/album/AlbumPortal'

export default function ExperienceSection() {
  const titleRef = useRef<THREE.Group>(null)
  const groupRef = useRef<THREE.Group>(null)
  const data = useScroll()
  const isMobile = useIsMobile()
  const size = useThree(state => state.size)
  const layoutScale = Math.min(1, size.width / size.height / 1.5)
  const isActive = usePortalStore((state) => !!state.activePortalId)

  useFrame((_, delta) => {
    const d = data.range(0.8, 0.2)
    const e = data.range(0.7, 0.2)

    if (groupRef.current && !isActive) {
      groupRef.current.position.y = d > 0 ? -1 : -30
      groupRef.current.visible = d > 0
    }

    if (titleRef.current) {
      titleRef.current.children.forEach((text, i) => {
        text.position.y = THREE.MathUtils.damp(text.position.y, Math.max(Math.min((1 - d) * (10 - i), 10), 0.5), 7, delta)
        ;(text as unknown as { fillOpacity: number }).fillOpacity = e
      })
    }
  })

  return (
    <group position={[0, -41.5, 12]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
      <group rotation={[0, 0, Math.PI / 2]}>
        <group ref={titleRef} position={[-3.6 * layoutScale, isMobile ? 1.6 : 2, -2]}>
          {'EXPERIENCE'.split('').map((letter, index) => (
            <Text key={`${letter}-${index}`} font={FONTS.serif} fontSize={isMobile ? 0.25 : 0.4} color="#f3f0e8" position={[index * 0.8 * layoutScale, 2, 1]}>{letter}</Text>
          ))}
        </group>
        <pointLight position={[-4, 5, 6]} intensity={70} distance={14} color="#fff0dc" />
        <pointLight position={[5, -2, 4]} intensity={40} distance={12} color="#c3e6ff" />
        <group position={[0, -1, 0]} ref={groupRef}>
          <GridTile id="work" title="Work" color="#b9c6d6" textAlign="left" position={new THREE.Vector3(-3 * layoutScale, -0.1, 0)}>
            <WorkPortal />
          </GridTile>
          <GridTile id="album" title="Album" color="#05070b" textAlign="left" position={new THREE.Vector3(0, 0.34, 0)}>
            <AlbumPortal />
          </GridTile>
          <GridTile id="projects" title="Projects" color="#bdd1e3" textAlign="left" position={new THREE.Vector3(3 * layoutScale, -0.1, 0)}>
            <ProjectsPortal />
          </GridTile>
        </group>
      </group>
    </group>
  )
}

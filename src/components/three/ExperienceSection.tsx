import { Text, useScroll } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePortalStore, FONTS } from '@/store'
import GridTile from '@/components/experience/GridTile'
import WorkPortal from '@/components/experience/work/WorkPortal'
import ProjectsPortal from '@/components/experience/projects/ProjectsPortal'

export default function ExperienceSection() {
  const titleRef = useRef<THREE.Group>(null)
  const groupRef = useRef<THREE.Group>(null)
  const data = useScroll()
  const isMobile = useIsMobile()
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

  const spacing = isMobile ? 0.4 : 0.8
  return (
    <group position={[0, -41.5, 12]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
      <group rotation={[0, 0, Math.PI / 2]}>
        <group ref={titleRef} position={[isMobile ? -1.8 : -3.6, 2, -2]}>
          {'EXPERIENCE'.split('').map((letter, index) => (
            <Text key={`${letter}-${index}`} font={FONTS.serif} fontSize={0.4} color="white" position={[index * spacing, 2, 1]}>
              {letter}
            </Text>
          ))}
        </group>
        <group position={[0, -1, 0]} ref={groupRef}>
          <GridTile id="work" title="WORK AND EDUCATION" color="#b9c6d6" textAlign="left" position={new THREE.Vector3(isMobile ? -1 : -2, 0, isMobile ? 0.4 : 0)}>
            <WorkPortal />
          </GridTile>
          <GridTile id="projects" title="SIDE PROJECTS" color="#bdd1e3" textAlign="right" position={new THREE.Vector3(isMobile ? 1 : 2, 0, 0)}>
            <ProjectsPortal />
          </GridTile>
        </group>
      </group>
    </group>
  )
}

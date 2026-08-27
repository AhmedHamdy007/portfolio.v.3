import { Edges, Text, type TextProps } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePortalStore } from '@/store'
import type { Project } from '@/types'

interface Props {
  project: Project
  index: number
  position: [number, number, number]
  rotation: [number, number, number]
  activeId: number | null
  onClick: () => void
  datePosition: 'top' | 'bottom'
}

export default function ProjectTile({ project, index, position, rotation, activeId, onClick, datePosition }: Props) {
  const isMobile = useIsMobile()
  const projectRef = useRef<THREE.Group>(null)
  const hoverAnimRef = useRef<gsap.core.Timeline | null>(null)
  const [desktopHovered, setDesktopHovered] = useState(false)
  const active = usePortalStore((state) => state.activePortalId === 'projects')
  const hovered = isMobile ? activeId === index : desktopHovered
  const isTop = datePosition === 'top'

  const titleProps = useMemo(() => ({ font: '/soria-font.ttf', color: 'black' }), [])
  const subtitleProps: Partial<TextProps> = useMemo(() => ({ font: '/Vercetti-Regular.woff', color: 'black', anchorX: 'left', anchorY: 'top' }), [])

  useEffect(() => {
    if (!projectRef.current) return
    hoverAnimRef.current?.kill()
    const [mesh, title, dateGroup, textBox, button] = projectRef.current.children
    hoverAnimRef.current = gsap.timeline()
    hoverAnimRef.current
      .to(projectRef.current.position, { z: hovered ? 1 : 0, duration: 0.2 }, 0)
      .to(projectRef.current.position, { y: hovered ? (isTop ? -2 : 0) : 0 }, 0)
      .to(projectRef.current.scale, { x: hovered ? 1.3 : 1, y: hovered ? 1.3 : 1, z: hovered ? 1.3 : 1 }, 0)
      .to(title.position, { y: hovered ? 0.7 : -0.8, duration: 0.25 }, 0)
      .to(textBox.position, { y: hovered ? 0.7 : 0 }, 0)
      .to(textBox, { fillOpacity: hovered ? 1 : 0, duration: 0.4 }, 0)
      .to(dateGroup.position, { y: hovered ? 2.6 : isTop ? 1.4 : -1.4 }, 0)
      .to(mesh.scale, { y: hovered ? 2 : 1 }, 0)
      .to((mesh as THREE.Mesh).material, { opacity: hovered ? 0.95 : 0.3 }, 0)
      .to(mesh.position, { y: hovered ? 1 : 0 }, 0)
    if (project.url && button) {
      hoverAnimRef.current
        .to(button.scale, { y: hovered ? 1 : 0, x: hovered ? 1 : 0 }, 0)
        .to(button.position, { z: hovered ? 0.3 : -1 }, 0)
    }
    return () => {
      hoverAnimRef.current?.kill()
    }
  }, [hovered, isTop, project.url])

  useEffect(() => {
    if (!projectRef.current) return
    gsap.to(projectRef.current.position, { y: active ? 0 : -11, duration: 1, delay: active ? index * 0.1 : 0 })
  }, [active, index])

  const openProject = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (project.url) window.open(project.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <group position={position} rotation={rotation} onClick={(event) => { event.stopPropagation(); onClick() }} onPointerOver={(event) => { event.stopPropagation(); if (!isMobile && active) setDesktopHovered(true) }} onPointerOut={() => !isMobile && active && setDesktopHovered(false)}>
      <group ref={projectRef}>
        <mesh>
          <planeGeometry args={[4.2, 2, 1]} />
          <meshBasicMaterial color="#fff" transparent opacity={0.3} />
          <Edges color="black" lineWidth={1.5} />
        </mesh>
        <Text {...titleProps} position={[-1.9, -0.8, 0.101]} anchorX="left" anchorY="bottom" maxWidth={4} fontSize={0.8}>{project.title}</Text>
        <group position={[-1.25, 1.4, 0.01]}>
          <mesh><planeGeometry args={[1.7, 0.4, 1]} /><meshBasicMaterial color="#777" transparent opacity={0} wireframe /><Edges color="black" lineWidth={1} /></mesh>
          <Text {...subtitleProps} position={[-0.7, 0.2, 0]} fontSize={0.3}>{project.date.toUpperCase()}</Text>
        </group>
        <Text {...subtitleProps} maxWidth={3.8} position={[-1.9, 2.3, 0.1]} fontSize={0.2}>{project.subtext}</Text>
        {project.url && <group position={[1.3, -0.6, -1]} scale={[0, 0, 1]} onClick={openProject}>
          <mesh><boxGeometry args={[1.1, 0.4, 0.2]} /><meshBasicMaterial color="#222" /><Edges color="white" lineWidth={1} /></mesh>
          <Text {...subtitleProps} color="white" position={[-0.4, 0.15, 0.2]} fontSize={0.25}>VIEW ↗</Text>
        </group>}
      </group>
    </group>
  )
}

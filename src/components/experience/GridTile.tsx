import { Edges, MeshPortalMaterial, Text, type TextProps, useCursor, useScroll } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import * as React from 'react'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePortalStore, FONTS } from '@/store'
import { TriangleGeometry } from './Triangle'

interface GridTileProps {
  id: string
  title: string
  textAlign: TextProps['textAlign']
  children: React.ReactNode
  color: string
  position: THREE.Vector3
}

export default function GridTile({ id, title, textAlign, children, color, position }: GridTileProps) {
  const titleRef = useRef<THREE.Mesh>(null)
  const gridRef = useRef<THREE.Mesh>(null)
  const hoverBoxRef = useRef<THREE.Mesh>(null)
  const portalRef = useRef<{ blend: number; blur: number }>(null)
  const isMobile = useIsMobile()
  const data = useScroll()
  const setActivePortal = usePortalStore((state) => state.setActivePortal)
  const activePortalId = usePortalStore((state) => state.activePortalId)
  const isActive = activePortalId === id
  const isAnyPortalActive = !!activePortalId

  useCursor(!isMobile && !isAnyPortalActive)

  useEffect(() => {
    if (!isMobile || !titleRef.current) return
    const isWork = id === 'work'
    gsap.to(titleRef.current, { fontSize: 0.13, maxWidth: 4, color: isWork ? '#FFF' : '#888', letterSpacing: 0.4 })
    gsap.to(titleRef.current.position, { x: isWork ? 1 : -1, y: isWork ? -1.7 : 1.5, duration: 0.5 })
  }, [id, isMobile])

  useFrame(() => {
    const d = data.range(0.95, 0.05)
    if (isMobile && titleRef.current) (titleRef.current as unknown as { fillOpacity: number }).fillOpacity = d
  })

  useEffect(() => {
    if (!portalRef.current) return
    gsap.to(portalRef.current, { blend: isActive ? 1 : 0, duration: isActive ? 0.5 : 1, overwrite: 'auto' })
  }, [isActive])

  const onPointerOver = () => {
    if (isMobile || isAnyPortalActive) return
    document.body.style.cursor = 'pointer'
    gsap.to(titleRef.current, { fillOpacity: 1, overwrite: 'auto' })
    if (gridRef.current) gsap.to(gridRef.current.position, { z: 0.5, duration: 0.4, overwrite: 'auto' })
    if (hoverBoxRef.current) gsap.to(hoverBoxRef.current.scale, { x: 1, y: 1, z: 1, duration: 0.4, overwrite: 'auto' })
  }

  const onPointerOut = () => {
    if (isMobile) return
    document.body.style.cursor = 'auto'
    gsap.to(titleRef.current, { fillOpacity: 0, overwrite: 'auto' })
    if (gridRef.current) gsap.to(gridRef.current.position, { z: 0, duration: 0.4, overwrite: 'auto' })
    if (hoverBoxRef.current) gsap.to(hoverBoxRef.current.scale, { x: 0, y: 0, z: 0, duration: 0.4, overwrite: 'auto' })
  }

  const geometry = isMobile
    ? TriangleGeometry({ points: id === 'work' ? [[-1, 2, 0], [-1, -2, 0], [3, -2, 0]] : [[-3, 2, 0], [1, -2, 0], [1, 2, 0]] })
    : null

  const fontProps: Partial<TextProps> = {
    font: FONTS.serif,
    maxWidth: 2,
    anchorX: 'center',
    anchorY: 'bottom',
    fontSize: 0.7,
    color: 'white',
    textAlign,
    fillOpacity: 0,
  }

  return (
    <mesh ref={gridRef} position={position} onClick={(event) => { if (!activePortalId) { event.stopPropagation(); setActivePortal(id) } }} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      {geometry ? <primitive object={geometry} attach="geometry" /> : <planeGeometry args={[4, 4, 1]} />}
      <group>
        <mesh position={[0, 0, -0.01]} ref={hoverBoxRef} scale={[0, 0, 0]}>
          <boxGeometry args={[4, 4, 0.5]} />
          <meshPhysicalMaterial color="#444" transparent opacity={0.3} />
          <Edges color="white" lineWidth={3} />
        </mesh>
        <Text position={[0, -1.8, 0.4]} {...fontProps} ref={titleRef}>{title}</Text>
      </group>
      <MeshPortalMaterial ref={portalRef as never} blend={0} resolution={0} blur={0}>
        <color attach="background" args={[color]} />
        {children}
      </MeshPortalMaterial>
    </mesh>
  )
}

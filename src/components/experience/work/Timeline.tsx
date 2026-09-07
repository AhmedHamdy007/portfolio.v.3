import { Box, Edges, Line, Text, type TextProps } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useMemo, useRef, useEffect } from 'react'
import type { Line2 } from 'three-stdlib'
import * as THREE from 'three'
import { useIsMobile } from '@/hooks/use-mobile'
import { WORK_TIMELINE } from '@/constants'
import { usePortalStore, useScrollStore } from '@/store'
import type { WorkTimelinePoint } from '@/types'

const leftOffset = new THREE.Vector3(-0.3, 0, -0.1)
const rightOffset = new THREE.Vector3(0.3, 0, -0.1)

function TimelinePoint({ point, index }: { point: WorkTimelinePoint; index: number }) {
  const root = useRef<THREE.Group>(null)
  const cube = useRef<THREE.Mesh>(null)
  const year = useRef<THREE.Mesh & { fillOpacity: number }>(null)
  const title = useRef<THREE.Mesh & { fillOpacity: number }>(null)
  const subtitle = useRef<THREE.Mesh & { fillOpacity: number }>(null)
  const isMobile = useIsMobile()
  const offset = point.position === 'left' ? leftOffset : rightOffset
  const align = point.position === 'left' ? 'right' : 'left'
  const textProps: Partial<TextProps> = useMemo(() => ({
    font: '/Vercetti-Regular.woff', color: 'white', anchorX: align,
  }), [align])
  useFrame(() => {
    if (!root.current) return
    const active = usePortalStore.getState().activePortalId === 'work'
    const progress = active ? useScrollStore.getState().scrollProgress : 0
    root.current.visible = active && index < Math.max(1, Math.round(progress * (WORK_TIMELINE.length - 1) + 1))
    if (!root.current.visible) return
    const diff = Math.min(2 * Math.max(index - progress * (WORK_TIMELINE.length - 1), 0), 1)
    cube.current?.scale.setScalar(1 - diff)
    if (year.current) { year.current.position.x = -diff / 2; year.current.fillOpacity = 2 - 2 * diff }
    if (title.current) { title.current.position.y = -diff / 2; title.current.fillOpacity = 2 - 2 * diff }
    if (subtitle.current) { subtitle.current.position.y = -0.4 - diff; subtitle.current.fillOpacity = 2 - 2 * diff }
  })

  return (
    <group ref={root} position={point.point} scale={isMobile ? 0.35 : 0.6}>
      <Box ref={cube} args={[0.2, 0.2, 0.2]} position={[0, 0, -0.1]}>
        <meshBasicMaterial color="white" wireframe />
        <Edges color="white" lineWidth={1.5} />
      </Box>
      <group position={offset}>
        <Text ref={year} {...textProps} fontSize={0.3}>{point.year}</Text>
        <group position={[0, -0.5, 0]}>
          <Text ref={title} {...textProps} font="/soria-font.ttf" fontSize={0.6} maxWidth={3}>{point.title}</Text>
          <Text ref={subtitle} {...textProps} fontSize={0.2} position={[0, -0.4, 0]}>{point.subtitle}</Text>
        </group>
      </group>
    </group>
  )
}

export default function Timeline() {
  const { camera } = useThree()
  const isMobile = useIsMobile()
  const isActive = usePortalStore((state) => state.activePortalId === 'work')
  const timeline = useMemo(() => WORK_TIMELINE, [])
  const curve = useMemo(() => new THREE.CatmullRomCurve3(timeline.map((item) => item.point), false), [timeline])
  const curvePoints = useMemo(() => curve.getPoints(500), [curve])
  const solidLine = useRef<Line2>(null)
  const dashedLine = useRef<Line2>(null)
  const draw = useRef({ value: 0 })
  const pointOnCurve = useMemo(() => new THREE.Vector3(), [])
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    const progress = isActive ? useScrollStore.getState().scrollProgress : 0
    // Keep GPU buffers stable; reveal existing segments, never rebuild LineGeometry.
    if (solidLine.current) solidLine.current.geometry.instanceCount = Math.max(0, Math.ceil(progress * curvePoints.length) - 1)
    if (dashedLine.current) dashedLine.current.geometry.instanceCount = Math.floor(draw.current.value * (curvePoints.length - 1))
    if (!isActive || usePortalStore.getState().isClosing) return
    const position = curve.getPoint(progress, pointOnCurve)
    // eslint-disable-next-line react-hooks/immutability
    camera.position.x = THREE.MathUtils.damp(camera.position.x, (isMobile ? -1 : -2) + position.x, 4, delta)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, -39 + position.z, 4, delta)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, 13 - position.y, 4, delta)
  })

  useEffect(() => {
    const animation = gsap.timeline()
    if (groupRef.current) {
      animation
        .to(groupRef.current.scale, { x: isActive ? 1 : 0, y: isActive ? 1 : 0, z: isActive ? 1 : 0, duration: 1, delay: isActive ? 0.4 : 0 })
        .to(groupRef.current.position, { y: isActive ? 0 : -2, duration: 1, delay: isActive ? 0.4 : 0 }, 0)
    }
    draw.current.value = 0
    if (isActive) animation.to(draw.current, { value: 1, duration: 1, ease: 'none' }, 1)
    return () => {
      animation.kill()
    }
  }, [curvePoints, isActive])

  return (
    <group position={[0, -0.1, -0.1]}>
      <Line ref={solidLine} points={curvePoints} color="white" lineWidth={3} />
      <Line ref={dashedLine} points={curvePoints} color="white" lineWidth={0.5} dashed dashSize={0.25} gapSize={0.25} />
      <group ref={groupRef}>
        {timeline.map((point, i) => <TimelinePoint point={point} index={i} key={`${point.year}-${point.title}`} />)}
      </group>
    </group>
  )
}

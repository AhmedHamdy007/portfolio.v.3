import { Box, Edges, Line, Text, type TextProps } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useMemo, useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { useIsMobile } from '@/hooks/use-mobile'
import { WORK_TIMELINE } from '@/constants'
import { usePortalStore } from '@/store'
import type { WorkTimelinePoint } from '@/types'

const leftOffset = new THREE.Vector3(-0.3, 0, -0.1)
const rightOffset = new THREE.Vector3(0.3, 0, -0.1)

function TimelinePoint({ point, diff }: { point: WorkTimelinePoint; diff: number }) {
  const isMobile = useIsMobile()
  const offset = point.position === 'left' ? leftOffset : rightOffset
  const align = point.position === 'left' ? 'right' : 'left'
  const textProps: Partial<TextProps> = useMemo(() => ({
    font: '/Vercetti-Regular.woff', color: 'white', anchorX: align, fillOpacity: 2 - 2 * diff,
  }), [align, diff])

  return (
    <group position={point.point} scale={isMobile ? 0.35 : 0.6}>
      <Box args={[0.2, 0.2, 0.2]} position={[0, 0, -0.1]} scale={[1 - diff, 1 - diff, 1 - diff]}>
        <meshBasicMaterial color="white" wireframe />
        <Edges color="white" lineWidth={1.5} />
      </Box>
      <group position={offset}>
        <Text {...textProps} fontSize={0.3} position={[-diff / 2, 0, 0]}>{point.year}</Text>
        <group position={[0, -0.5, 0]}>
          <Text {...textProps} font="/soria-font.ttf" fontSize={0.6} maxWidth={3} position={[0, -diff / 2, 0]}>{point.title}</Text>
          <Text {...textProps} fontSize={0.2} position={[0, -0.4 - diff, 0]}>{point.subtitle}</Text>
        </group>
      </group>
    </group>
  )
}

export default function Timeline({ progress }: { progress: number }) {
  const { camera } = useThree()
  const isMobile = useIsMobile()
  const isActive = usePortalStore((state) => state.activePortalId === 'work')
  const timeline = useMemo(() => WORK_TIMELINE, [])
  const curve = useMemo(() => new THREE.CatmullRomCurve3(timeline.map((item) => item.point), false), [timeline])
  const curvePoints = useMemo(() => curve.getPoints(500), [curve])
  const visibleCurve = useMemo(() => curvePoints.slice(0, Math.max(1, Math.ceil(progress * curvePoints.length))), [curvePoints, progress])
  const visiblePoints = useMemo(() => timeline.slice(0, Math.max(1, Math.round(progress * (timeline.length - 1) + 1))), [timeline, progress])
  const [dashed, setDashed] = useState<THREE.Vector3[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (!isActive) return
    const position = curve.getPoint(progress)
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
    if (timerRef.current) clearInterval(timerRef.current)
    if (!isActive) {
      setDashed([])
      return
    }
    let step = 0
    const timeout = setTimeout(() => {
      timerRef.current = setInterval(() => {
        step += 1
        setDashed(curvePoints.slice(0, Math.max(1, Math.ceil((step / 100) * curvePoints.length))))
        if (step >= 100 && timerRef.current) clearInterval(timerRef.current)
      }, 10)
    }, 1000)
    return () => {
      animation.kill()
      clearTimeout(timeout)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [curvePoints, isActive])

  return (
    <group position={[0, -0.1, -0.1]}>
      <Line points={visibleCurve} color="white" lineWidth={3} />
      {dashed.length > 0 && <Line points={dashed} color="white" lineWidth={0.5} dashed dashSize={0.25} gapSize={0.25} />}
      <group ref={groupRef}>
        {visiblePoints.map((point, i) => {
          const diff = Math.min(2 * Math.max(i - progress * (timeline.length - 1), 0), 1)
          return <TimelinePoint point={point} diff={diff} key={`${point.year}-${point.title}`} />
        })}
      </group>
    </group>
  )
}

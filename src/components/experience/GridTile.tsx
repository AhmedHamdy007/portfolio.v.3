import { MeshPortalMaterial, Text, useScroll, type TextProps } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePortalStore, FONTS } from '@/store'
import { createGatewayGeometry } from './gatewayGeometry'
import { capturePortalCamera, returnPortalCamera } from './portalTransition'

interface GridTileProps {
  id: string
  title: string
  textAlign: TextProps['textAlign']
  children: ReactNode
  color: string
  position: THREE.Vector3
}

export default function GridTile({ id, title, children, color, position }: GridTileProps) {
  const portalRef = useRef<{ blend: number }>(null)
  const label = useRef<THREE.Group>(null)
  const hovered = useRef(false)
  const pose = useRef({ x: 0, y: 0, z: 0, lift: 0 })
  const reduced = useRef(false)
  const camera = useThree(state => state.camera)
  const returnPose = useRef<ReturnType<typeof capturePortalCamera> | null>(null)
  const isMobile = useIsMobile()
  const size = useThree(state => state.size)
  const layoutScale = Math.min(1, size.width / size.height / 1.5)
  const scroll = useScroll()
  const setActivePortal = usePortalStore(state => state.setActivePortal)
  const activePortalId = usePortalStore(state => state.activePortalId)
  const isActive = activePortalId === id
  const isClosing = usePortalStore(state => state.isClosing)
  const width = 2.65 * layoutScale
  const height = isMobile ? 2.85 : 3.65
  const surfaces = useMemo(() => createGatewayGeometry(width, height), [width, height])
  const scratch = useMemo(() => ({ surfaces, matrix: new THREE.Matrix4(), previous: new THREE.Matrix4(), rotation: new THREE.Euler(), label: new THREE.Vector3() }), [surfaces])
  const side = id === 'work' ? -1 : id === 'projects' ? 1 : 0

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { reduced.current = query.matches }
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  useEffect(() => () => surfaces.forEach(({ geometry }) => geometry.dispose()), [surfaces])

  useEffect(() => {
    if (!portalRef.current || isClosing) return
    const tween = gsap.to(portalRef.current, { blend: isActive ? 1 : 0, duration: reduced.current ? 0.25 : id === 'album' ? 2 : 0.65, ease: 'power2.inOut', overwrite: 'auto' })
    return () => { tween.kill() }
  }, [id, isActive, isClosing])
  useLayoutEffect(() => {
    if (!isActive || !isClosing || !portalRef.current || !returnPose.current) return
    const material = portalRef.current
    const from = capturePortalCamera(camera)
    const destination = returnPose.current
    const state = { progress: 0 }
    const block = (event: Event) => event.preventDefault()
    window.addEventListener('wheel', block, { capture: true, passive: false })
    window.addEventListener('touchmove', block, { capture: true, passive: false })
    gsap.killTweensOf(material)
    const duration = reduced.current ? 0.25 : id === 'album' ? 2 : 1.2
    const timeline = gsap.timeline({ paused: true, onComplete: () => {
      material.blend = 0
      returnPortalCamera(camera, from, destination, 1)
      usePortalStore.getState().finishPortalExit(id)
      const outer = document.querySelector<HTMLElement>('[data-scroll-owner="outer"]')
      if (outer) { outer.tabIndex = -1; outer.focus({ preventScroll: true }) }
    } })
      .to(state, { progress: 1, duration, ease: 'power2.inOut', onUpdate: () => returnPortalCamera(camera, from, destination, state.progress) }, 0)
      .to(material, { blend: 0, duration: duration * 0.85, ease: 'power2.inOut' }, duration * 0.15)
    const started = performance.now()
    const tick = () => { timeline.time((performance.now() - started) / 1000) }
    gsap.ticker.add(tick)
    return () => {
      gsap.ticker.remove(tick)
      timeline.kill()
      window.removeEventListener('wheel', block, true)
      window.removeEventListener('touchmove', block, true)
    }
  }, [camera, id, isActive, isClosing])
  useEffect(() => {
    if (activePortalId) { hovered.current = false; document.body.style.cursor = '' }
    return () => { document.body.style.cursor = '' }
  }, [activePortalId])

  useFrame(({ pointer }, delta) => {
    // Sculpt the aperture, not its parent transform: portal scene matrices and
    // the existing Work/Projects camera coordinates stay completely unchanged.
    if (activePortalId || scroll.offset < 0.75) return
    const interactive = !isMobile && !reduced.current
    const reveal = reduced.current ? 1 : THREE.MathUtils.smoothstep(scroll.offset, 0.79, 0.98)
    const lift = interactive && hovered.current ? 0.18 : 0
    const p = pose.current, dt = Math.min(delta, 0.05)
    p.x = THREE.MathUtils.damp(p.x, side ? -0.12 : 0.1, 5, dt)
    p.y = THREE.MathUtils.damp(p.y, -side * 0.34 + (interactive ? pointer.x * 0.075 : 0), 5, dt)
    p.z = THREE.MathUtils.damp(p.z, side * 0.13 + (side ? 0 : -0.08) + (interactive ? pointer.y * 0.025 : 0), 5, dt)
    p.lift = THREE.MathUtils.damp(p.lift, lift, 6, dt)
    scratch.rotation.set(p.x + (1 - reveal) * 0.38, p.y, p.z)
    scratch.matrix.makeRotationFromEuler(scratch.rotation)
    scratch.matrix.setPosition(0, p.lift - (1 - reveal) * 0.35, (side ? -0.5 : 0.45) + p.lift)
    if (scratch.matrix.elements.every((value, index) => Math.abs(value - scratch.previous.elements[index]) < 0.00001)) return
    scratch.previous.copy(scratch.matrix)
    for (const { geometry, positions, normals } of scratch.surfaces) {
      ;(geometry.attributes.position as THREE.BufferAttribute).copy(positions)
      ;(geometry.attributes.normal as THREE.BufferAttribute).copy(normals)
      geometry.applyMatrix4(scratch.matrix)
      geometry.computeBoundingSphere()
    }
    if (label.current) {
      scratch.label.set(0, -height / 2 - 0.34, 0.03).applyMatrix4(scratch.matrix)
      label.current.position.copy(scratch.label)
      label.current.rotation.copy(scratch.rotation)
    }
  })

  return <mesh position={position} geometry={surfaces[0].geometry}
    onClick={event => { if (!activePortalId) { event.stopPropagation(); returnPose.current = capturePortalCamera(camera); setActivePortal(id) } }}
    onPointerOver={event => { if (!activePortalId && !isMobile) { event.stopPropagation(); hovered.current = true; document.body.style.cursor = 'pointer' } }}
    onPointerOut={() => { hovered.current = false; document.body.style.cursor = '' }}>
    <mesh geometry={surfaces[1].geometry} raycast={() => {}}>
      <meshStandardMaterial color="#d4d9d6" metalness={0.65} roughness={0.3} />
    </mesh>
    <group ref={label}>
      <Text font={FONTS.serif} anchorX="center" anchorY="middle" fontSize={isMobile ? 0.13 : 0.24} color="#f3f0e8" maxWidth={width} textAlign="center">{title}</Text>
    </group>
    <MeshPortalMaterial ref={portalRef as never} blend={0} resolution={0} blur={0} side={THREE.DoubleSide}>
      <color attach="background" args={[color]} />
      {children}
    </MeshPortalMaterial>
  </mesh>
}

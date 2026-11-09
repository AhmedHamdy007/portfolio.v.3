import { Cloud, Clouds, Stars, Text } from '@react-three/drei'
import { useScroll } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import WindowModel from '@/components/models/WindowModel'
import TextWindow from './TextWindow'
import { useThemeStore, FONTS } from '@/store'
import { useLoadingState } from '@/components/chrome/loadingState'

function CloudContainer() {
  return (
    <Clouds texture="/cloud.png" material={THREE.MeshBasicMaterial} position={[0, -5, 0]} frustumCulled={false}>
      <Cloud seed={1} segments={1} concentrate="inside" bounds={[10, 10, 10]} growth={3} position={[-1, 0, 0]} smallestVolume={2} scale={1.9} volume={2} speed={0.2} fade={5} />
      <Cloud seed={3} segments={1} concentrate="outside" bounds={[10, 10, 10]} growth={2} position={[2, 0, 2]} smallestVolume={2} scale={1} volume={2} fade={3} speed={0.1} />
      <Cloud seed={4} segments={1} concentrate="outside" bounds={[10, 20, 15]} growth={4} position={[-10, -10, 4]} smallestVolume={2} scale={2} speed={0.2} volume={3} />
      <Cloud seed={5} segments={1} concentrate="outside" bounds={[5, 5, 5]} growth={2} position={[6, -3, 8]} smallestVolume={2} scale={2} volume={2} fade={0.1} speed={0.1} />
      <Cloud seed={6} segments={1} concentrate="outside" bounds={[5, 5, 5]} growth={2} position={[0, -20, 20]} smallestVolume={2} scale={4} volume={3} fade={0.1} speed={0.1} />
      <Cloud seed={7} segments={1} concentrate="outside" bounds={[5, 5, 5]} growth={2} position={[10, -15, -5]} smallestVolume={2} scale={3} volume={3} speed={0.1} />
    </Clouds>
  )
}

function StarsContainer() {
  const isDark = useThemeStore((state) => state.theme.type === 'dark')
  if (!isDark) return null
  return <Stars radius={200} depth={100} count={5000} factor={10} saturation={10} fade speed={1} />
}

export default function Hero() {
  const titleRef = useRef<THREE.Mesh>(null)
  const windowLight = useRef<THREE.PointLight>(null)
  const shadowPose = useRef(NaN)
  const scroll = useScroll()
  const revealing = useLoadingState(state => state.phase !== 'loading')

  useFrame(() => {
    const light = windowLight.current
    if (!light) return
    // Camera movement does not change a shadow map. Rebuild its six faces
    // only when the actual handle/door geometry changes, including reverse scroll.
    const pose = scroll.range(0.4, 0.1) + scroll.range(0.5, 0.1)
    if (pose !== shadowPose.current || !light.shadow.map) {
      light.shadow.needsUpdate = true
      shadowPose.current = pose
    }
  })

  useEffect(() => {
    if (!revealing || !titleRef.current) return
    const tween = gsap.fromTo(titleRef.current.position, { y: -10 }, { y: 0, duration: 2.1, ease: 'power3.out', overwrite: 'auto' })
    return () => { tween.kill() }
  }, [revealing])

  return (
    <>
      <Text ref={titleRef} position={[0, -10, -10]} font={FONTS.serif} fontSize={1.2} color="white">
        Hi, I am Ahmed Hamdy.
      </Text>
      <StarsContainer />
      <CloudContainer />
      <group position={[0, -25, 5.69]}>
        <pointLight ref={windowLight} castShadow shadow-autoUpdate={false} position={[1, 1, -2.5]} intensity={60} distance={10} />
        <WindowModel receiveShadow />
        <TextWindow />
      </group>
    </>
  )
}

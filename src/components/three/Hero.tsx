import { Cloud, Clouds, Stars, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Component, Suspense, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { FONTS, useThemeStore } from '@/store'

function HeroTitle() {
  const titleRef = useRef<THREE.Mesh>(null)

  // Rise into view driven by the render loop (robust everywhere).
  useFrame((_, delta) => {
    if (titleRef.current) {
      titleRef.current.position.y = THREE.MathUtils.damp(
        titleRef.current.position.y,
        2,
        1.2,
        delta
      )
    }
  })

  return (
    <Text
      ref={titleRef}
      position={[0, -8, -6]}
      font={FONTS.serif}
      fontSize={1.2}
      color="white"
      anchorX="center"
      anchorY="middle"
      maxWidth={8}
    >
      Ahmed. Still Becoming.
    </Text>
  )
}

function AmbientDust() {
  const pointsRef = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const count = 520
    const data = new Float32Array(count * 3)
    let seed = 11
    const rnd = () => {
      seed = (seed * 48271) % 2147483647
      return (seed - 1) / 2147483646
    }

    for (let i = 0; i < count; i++) {
      data[i * 3] = (rnd() - 0.5) * 20
      data[i * 3 + 1] = -6 - rnd() * 42
      data[i * 3 + 2] = (rnd() - 0.5) * 18
    }
    return data
  }, [])

  useFrame(({ clock }) => {
    if (!pointsRef.current) return
    pointsRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.08) * 0.08
    pointsRef.current.position.x = Math.sin(clock.elapsedTime * 0.12) * 0.25
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#f5f3ec"
        size={0.028}
        transparent
        opacity={0.38}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

/** Night-only starfield, like the reference. */
function StarsContainer() {
  const isDark = useThemeStore((s) => s.theme.type === 'dark')
  if (!isDark) return null
  return (
    <Stars
      radius={200}
      depth={100}
      count={5000}
      factor={10}
      saturation={10}
      fade
      speed={1}
    />
  )
}

/**
 * Big fluffy clouds drifting below the hero title —
 * same parameters as the reference site.
 */
function CloudContainer() {
  return (
    <Clouds material={THREE.MeshBasicMaterial} position={[0, -5, 0]} frustumCulled={false}>
      <Cloud
        seed={1}
        segments={1}
        concentrate="inside"
        bounds={[10, 10, 10]}
        growth={3}
        position={[-1, 0, 0]}
        smallestVolume={2}
        scale={1.9}
        volume={2}
        speed={0.2}
        fade={5}
      />
      <Cloud
        seed={3}
        segments={1}
        concentrate="outside"
        bounds={[10, 10, 10]}
        growth={2}
        position={[2, 0, 2]}
        smallestVolume={2}
        scale={1}
        volume={2}
        fade={3}
        speed={0.1}
      />
      <Cloud
        seed={4}
        segments={1}
        concentrate="outside"
        bounds={[10, 20, 15]}
        growth={4}
        position={[-10, -10, 4]}
        smallestVolume={2}
        scale={2}
        speed={0.2}
        volume={3}
      />
      <Cloud
        seed={5}
        segments={1}
        concentrate="outside"
        bounds={[5, 5, 5]}
        growth={2}
        position={[6, -3, 8]}
        smallestVolume={2}
        scale={2}
        volume={2}
        fade={0.1}
        speed={0.1}
      />
      <Cloud
        seed={6}
        segments={1}
        concentrate="outside"
        bounds={[5, 5, 5]}
        growth={2}
        position={[0, -20, 20]}
        smallestVolume={2}
        scale={4}
        volume={3}
        fade={0.1}
        speed={0.1}
      />
      <Cloud
        seed={7}
        segments={1}
        concentrate="outside"
        bounds={[5, 5, 5]}
        growth={2}
        position={[10, -15, -5]}
        smallestVolume={2}
        scale={3}
        volume={3}
        fade={0.1}
        speed={0.1}
      />
    </Clouds>
  )
}

/* Procedural fallback if the drei's cloud texture CDN is unreachable. */
function FallbackClouds() {
  const texture = useMemo(() => {
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')!
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, 'rgba(255,255,255,0.9)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.4)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    return new THREE.CanvasTexture(canvas)
  }, [])

  const puffs = useMemo(() => {
    const items: { pos: [number, number, number]; s: number; o: number }[] = []
    let seed = 42
    const rnd = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }
    const centers: [number, number, number][] = [
      [-3, -6, 2], [4, -8, 4], [-9, -12, 2], [7, -14, -2], [0, -18, 6],
    ]
    centers.forEach((c) => {
      for (let i = 0; i < 16; i++) {
        items.push({
          pos: [c[0] + (rnd() - 0.5) * 9, c[1] + (rnd() - 0.5) * 3, c[2] + (rnd() - 0.5) * 5],
          s: 3 + rnd() * 5,
          o: 0.35 + rnd() * 0.4,
        })
      }
    })
    return items
  }, [])

  return (
    <group>
      {puffs.map((p, i) => (
        <sprite key={i} position={p.pos} scale={[p.s, p.s * 0.6, 1]}>
          <spriteMaterial map={texture} transparent opacity={p.o} depthWrite={false} />
        </sprite>
      ))}
    </group>
  )
}

function OpeningWindow() {
  const sashRef = useRef<THREE.Group>(null)
  const handleRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const breath = Math.sin(t * 0.7) * 0.025

    if (sashRef.current) {
      sashRef.current.rotation.y = THREE.MathUtils.damp(
        sashRef.current.rotation.y,
        -0.12 + breath,
        2,
        delta
      )
    }
    if (handleRef.current) {
      handleRef.current.rotation.x = Math.sin(t * 1.4) * 0.12
    }
  })

  const material = (
    <meshStandardMaterial
      color="#f5f3ec"
      roughness={0.46}
      metalness={0.08}
      emissive="#ffffff"
      emissiveIntensity={0.08}
    />
  )

  return (
    <group position={[0, -25, 5.65]} scale={1.05}>
      <pointLight position={[0.7, 1.1, -2.4]} intensity={28} distance={9} color="#fff6df" />
      <group>
        <mesh position={[0, 0, 2.55]} castShadow receiveShadow>
          <boxGeometry args={[5.7, 0.18, 0.34]} />
          {material}
        </mesh>
        <mesh position={[0, 0, -2.55]} castShadow receiveShadow>
          <boxGeometry args={[5.7, 0.18, 0.34]} />
          {material}
        </mesh>
        <mesh position={[2.55, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.34, 0.18, 5.7]} />
          {material}
        </mesh>
        <mesh position={[-2.55, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.34, 0.18, 5.7]} />
          {material}
        </mesh>
      </group>

      <group ref={sashRef} position={[-2.5, 0.02, 0]}>
        <group position={[2.5, 0, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[5.05, 0.1, 0.12]} />
            {material}
          </mesh>
          <mesh rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[5.05, 0.1, 0.12]} />
            {material}
          </mesh>
          <mesh ref={handleRef} position={[1.7, 0.12, 0.36]} castShadow>
            <capsuleGeometry args={[0.06, 0.34, 8, 14]} />
            <meshStandardMaterial color="#ede8d7" roughness={0.28} metalness={0.35} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

class CloudBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? <FallbackClouds /> : this.props.children
  }
}

export default function Hero() {
  return (
    <>
      <HeroTitle />
      <AmbientDust />
      <StarsContainer />
      <CloudBoundary>
        <Suspense fallback={<FallbackClouds />}>
          <CloudContainer />
        </Suspense>
      </CloudBoundary>
      <OpeningWindow />
    </>
  )
}

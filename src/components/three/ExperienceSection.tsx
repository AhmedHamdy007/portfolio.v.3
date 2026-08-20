import { Edges, Float, MeshPortalMaterial, RoundedBox, Text, useCursor, useScroll, useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useRef, useState, type Ref } from 'react'
import * as THREE from 'three'
import { FONTS, usePortalStore } from '@/store'
import { useIsMobile } from '@/hooks/use-mobile'

interface TileProps {
  id: string
  title: string
  image: string
  position: [number, number, number]
  textAlign: 'left' | 'right'
  portalColor: string
}

function PortalScene({ title, image, portalColor }: Pick<TileProps, 'title' | 'image' | 'portalColor'>) {
  const texture = useTexture(image)
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    texture.needsUpdate = true
  }, [texture])

  return (
    <>
      <color attach="background" args={[portalColor]} />
      <ambientLight intensity={0.8} />
      <pointLight position={[1.8, 1.4, 2]} intensity={7} color="#fff4d6" />
      <Float speed={1.25} rotationIntensity={0.12} floatIntensity={0.35}>
        <group position={[0, 0, -2.8]}>
          <mesh position={[0, 0.08, 0]}>
            <planeGeometry args={[2.55, 3.18]} />
            <meshBasicMaterial map={texture} toneMapped={false} />
          </mesh>
          <RoundedBox args={[2.78, 3.42, 0.08]} radius={0.04} smoothness={4} position={[0, 0.04, -0.08]}>
            <meshStandardMaterial color="#f5f3ec" roughness={0.55} />
          </RoundedBox>
          <Text
            position={[0, -2.05, 0.1]}
            font={FONTS.serif}
            fontSize={0.22}
            color="#ffffff"
            anchorX="center"
            textAlign="center"
            maxWidth={2.8}
          >
            {title}
          </Text>
        </group>
      </Float>
    </>
  )
}

function GridTile({ id, title, image, position, textAlign, portalColor }: TileProps) {
  const texture = useTexture(image)
  const groupRef = useRef<THREE.Group>(null)
  const titleRef = useRef<THREE.Mesh>(null)
  const portalRef = useRef<{ blend: number; blur: number } | null>(null)
  const [hovered, setHovered] = useState(false)
  const setActivePortal = usePortalStore((s) => s.setActivePortal)
  const activePortalId = usePortalStore((s) => s.activePortalId)
  const isActive = activePortalId === id

  useCursor(hovered)

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    texture.needsUpdate = true
  }, [texture])

  useEffect(() => {
    if (titleRef.current) {
      gsap.to(titleRef.current, { fillOpacity: hovered ? 1 : 0.65, duration: 0.4 })
    }
    if (groupRef.current) {
      gsap.to(groupRef.current.position, { z: hovered ? 0.6 : 0, duration: 0.5, ease: 'power2.out' })
      gsap.to(groupRef.current.scale, {
        x: hovered ? 1.03 : 1,
        y: hovered ? 1.03 : 1,
        duration: 0.5,
        ease: 'power2.out',
      })
    }
    if (portalRef.current) {
      gsap.to(portalRef.current, {
        blend: isActive ? 0.96 : hovered ? 0.22 : 0,
        blur: isActive ? 0 : hovered ? 0.18 : 0,
        duration: 0.55,
        ease: 'power2.out',
      })
    }
  }, [hovered, isActive])

  const onClick = (e: { stopPropagation: () => void }) => {
    if (activePortalId) return
    e.stopPropagation()
    setActivePortal(id)
  }

  return (
    <group position={position}>
      <group
        ref={groupRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={onClick}
      >
        {/* artwork */}
        <mesh>
          <planeGeometry args={[3, 3.75]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.04]}>
          <planeGeometry args={[3, 3.75]} />
          <MeshPortalMaterial
            ref={portalRef as Ref<null>}
            blend={0}
            blur={0}
            resolution={256}
            side={THREE.DoubleSide}
          >
            <PortalScene title={title} image={image} portalColor={portalColor} />
          </MeshPortalMaterial>
        </mesh>
        {/* thin cream frame */}
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[3.12, 3.87]} />
          <meshBasicMaterial color="#f5f3ec" />
        </mesh>
        <Edges color="#ffffff" lineWidth={1.2} scale={1.012} />
      </group>
      <Text
        ref={titleRef}
        position={[textAlign === 'left' ? -1.4 : 1.4, 2.35, 0]}
        font={FONTS.serif}
        fontSize={0.28}
        letterSpacing={0.35}
        color="white"
        maxWidth={3}
        textAlign={textAlign}
        anchorX={textAlign}
        fillOpacity={0.65}
      >
        {title}
      </Text>
    </group>
  )
}

/**
 * Flat "floor" layout facing the downward-looking camera —
 * per-letter EXPERIENCE title that settles in as you scroll,
 * above two hoverable artwork tiles (work / side projects).
 */
export default function ExperienceSection() {
  const titleRef = useRef<THREE.Group>(null)
  const groupRef = useRef<THREE.Group>(null)
  const data = useScroll()
  const isPortalActive = usePortalStore((s) => !!s.activePortalId)
  const isDesktop = !useIsMobile()

  useFrame((_, delta) => {
    const d = data.range(0.8, 0.2)
    const e = data.range(0.7, 0.2)

    if (groupRef.current && !isPortalActive) {
      groupRef.current.position.y = d > 0 ? -1 : -30
      groupRef.current.visible = d > 0
    }

    if (titleRef.current) {
      titleRef.current.children.forEach((text, i) => {
        const y = Math.max(Math.min((1 - d) * (10 - i), 10), 0.5)
        text.position.y = THREE.MathUtils.damp(text.position.y, y, 7, delta)
        ;(text as unknown as { fillOpacity: number }).fillOpacity = e
      })
    }
  })

  const letters = 'EXPERIENCE'.split('').map((char, i) => (
    <Text
      key={i}
      font={FONTS.serif}
      fontSize={0.4}
      color="white"
      position={[i * (isDesktop ? 0.8 : 0.42), 2, 1]}
    >
      {char}
    </Text>
  ))

  return (
    <group position={[0, -41.5, 12]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
      <group rotation={[0, 0, Math.PI / 2]}>
        <group ref={titleRef} position={[isDesktop ? -3.6 : -1.85, 2, -2]}>
          {letters}
        </group>

        <group position={[0, -1, 0]} ref={groupRef}>
          <GridTile
            id="work"
            title="WORK AND EDUCATION"
            image="/art/persistence.jpg"
            portalColor="#7a90a6"
            textAlign="left"
            position={[isDesktop ? -2 : -1.1, 0, isDesktop ? 0 : 0.5]}
          />
          <GridTile
            id="projects"
            title="SIDE PROJECTS"
            image="/art/wanderer.jpg"
            portalColor="#4d7590"
            textAlign="right"
            position={[isDesktop ? 2 : 1.1, 0, 0]}
          />
        </group>
      </group>
    </group>
  )
}

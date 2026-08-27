import { Text, useCursor, useScroll } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { FONTS } from '@/store'
import { useIsMobile } from '@/hooks/use-mobile'
import { FOOTER_LINKS } from '@/constants/footer'
import type { FooterLink } from '@/types/footer'

function FooterLinkItem({ link }: { link: FooterLink }) {
  const textRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  // Floating hover label that follows the cursor (like the reference).
  useEffect(() => {
    const id = `footer-link-${link.name}`
    let div = document.getElementById(id)
    if (!div) {
      div = document.createElement('div')
      div.id = id
      div.textContent = (link.hoverText ?? link.name).toUpperCase()
      Object.assign(div.style, {
        position: 'fixed',
        zIndex: '45',
        bottom: '0',
        opacity: '0',
        left: window.innerWidth / 2 + 'px',
        fontSize: '0.65rem',
        letterSpacing: '0.25em',
        color: '#fff',
        pointerEvents: 'none',
        fontFamily: 'Inter, sans-serif',
      })
      document.body.appendChild(div)
    }
    return () => {
      document.getElementById(id)?.remove()
    }
  }, [link.name, link.hoverText])

  useEffect(() => {
    const div = document.getElementById(`footer-link-${link.name}`)
    const textObject = textRef.current
    if (hovered && div) {
      gsap.fromTo(div, { opacity: 0 }, { opacity: 0.6, delay: 0.15 })
    } else if (div) {
      gsap.to(div, { opacity: 0 })
    }
    if (textObject) {
      gsap.to(textObject, { letterSpacing: hovered ? 0.3 : 0, duration: 0.3 })
    }
    return () => {
      if (div) gsap.killTweensOf(div)
      if (textObject) gsap.killTweensOf(textObject)
    }
  }, [hovered, link.name])

  const onPointerMove = (e: { clientX?: number; clientY?: number; nativeEvent?: MouseEvent }) => {
    const ev = ('nativeEvent' in e && e.nativeEvent ? e.nativeEvent : e) as MouseEvent
    const div = document.getElementById(`footer-link-${link.name}`)
    if (div && ev.clientX !== undefined) {
      gsap.to(div, { top: `${ev.clientY + 14}px`, left: `${ev.clientX}px`, duration: 0.6 })
    }
  }

  return (
    <Text
      ref={textRef}
      font={FONTS.sans}
      fontSize={0.2}
      color="white"
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onPointerMove={onPointerMove}
      onClick={() => link.url !== '#' && window.open(link.url, '_blank')}
    >
      {link.name.toUpperCase()}
    </Text>
  )
}

export default function Footer3D() {
  const groupRef = useRef<THREE.Group>(null)
  const data = useScroll()
  const isDesktop = !useIsMobile()

  useFrame(() => {
    const d = data.range(0.8, 0.2)
    if (groupRef.current) groupRef.current.visible = d > 0
  })

  return (
    <group position={[0, -44, 18]} rotation={[-Math.PI / 2, 0, 0]} ref={groupRef}>
      <group position={[isDesktop ? -4 : -2.6, 0, 0]}>
        {FOOTER_LINKS.map((link, i) => (
          <group key={link.name} position={[i * (isDesktop ? 2 : 1.05), 0, 0]}>
            <FooterLinkItem link={link} />
          </group>
        ))}
      </group>
    </group>
  )
}

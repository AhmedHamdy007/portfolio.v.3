import { ScrollControls } from '@react-three/drei'
import { useEffect } from 'react'
import * as THREE from 'three'
import { usePortalStore, useScrollStore } from '@/store'
import { Memory } from '@/components/models/Memory'
import Timeline from './Timeline'

function getScrollRoots() {
  return Array.from(document.querySelectorAll<HTMLDivElement>('div')).filter(
    (element) => element.scrollHeight > element.clientHeight + 10 && element.style.overflow.includes('auto'),
  )
}

/** Reference portal handoff: swap the nested scroll layer above the page layer. */
export default function WorkPortal() {
  const isActive = usePortalStore((state) => state.activePortalId === 'work')
  const { scrollProgress, setScrollProgress } = useScrollStore()

  useEffect(() => {
    let nested: HTMLDivElement | undefined
    let handleScroll: (() => void) | undefined

    const syncLayers = () => {
      const roots = getScrollRoots()
      const ordered = [...roots].sort((a, b) => a.scrollHeight - b.scrollHeight)
      nested = ordered[0]
      const page = ordered[ordered.length - 1]
      if (!nested || !page || nested === page) return

      const previousHandle = handleScroll
      if (previousHandle) nested.removeEventListener('scroll', previousHandle)
      handleScroll = () => {
        const max = nested!.scrollHeight - nested!.clientHeight
        setScrollProgress(max > 0 ? Math.min(Math.max(nested!.scrollTop / max, 0), 1) : 0)
      }

      if (isActive) {
        setScrollProgress(0)
        nested.addEventListener('scroll', handleScroll, { passive: true })
        nested.style.zIndex = '1'
        page.style.zIndex = '-1'
        handleScroll()
      } else {
        nested.scrollTo({ top: 0, behavior: 'smooth' })
        nested.style.zIndex = '-1'
        page.style.zIndex = '1'
        setScrollProgress(0)
      }
    }

    syncLayers()
    const retry = window.setTimeout(syncLayers, 100)
    return () => {
      window.clearTimeout(retry)
      if (nested && handleScroll) nested.removeEventListener('scroll', handleScroll)
    }
  }, [isActive, setScrollProgress])

  return (
    <group>
      <mesh receiveShadow>
        <planeGeometry args={[4, 4, 1]} />
        <shadowMaterial opacity={0.1} />
      </mesh>
      <ScrollControls style={{ zIndex: -1 }} pages={2} maxSpeed={0.4}>
        <Memory scale={new THREE.Vector3(5, 5, 5)} position={new THREE.Vector3(0, -6, 1)} />
        <Timeline progress={isActive ? scrollProgress : 0} />
      </ScrollControls>
    </group>
  )
}

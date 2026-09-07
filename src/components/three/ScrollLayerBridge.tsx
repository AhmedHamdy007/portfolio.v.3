import { useScroll } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { usePortalStore } from '@/store'
import { useAlbumState } from '@/components/experience/album/albumState'

export function OuterScrollLayer() {
  const scroll = useScroll()
  const connected = useThree(state => state.events.connected)
  const connect = useThree(state => state.events.connect)
  const active = usePortalStore(state => state.activePortalId)

  useEffect(() => {
    // Deferred nested ScrollControls connect themselves on mount. Keep the
    // homepage's event source until a portal is actually entered.
    if (!active && connected !== scroll.el) connect?.(scroll.el)
  }, [active, connected, connect, scroll])

  useEffect(() => {
    const element = scroll.el
    // Drei exposes the mutable scroll layer; ownership is coordinated through it.
    // eslint-disable-next-line react-hooks/immutability
    element.dataset.scrollOwner = 'outer'
    element.style.zIndex = '1'
    element.style.pointerEvents = 'auto'

    return () => {
      delete element.dataset.scrollOwner
    }
  }, [scroll])

  return null
}

interface NestedScrollLayerProps {
  id: string
  active: boolean
  onProgress: (progress: number) => void
}

/**
 * Gives a nested Drei ScrollControls instance exclusive wheel/touch ownership.
 * Native scroll is the reliable input, then one damped value drives DOM and 3D.
 */
export function NestedScrollLayer({ id, active, onProgress }: NestedScrollLayerProps) {
  const scroll = useScroll()
  const targetProgress = useRef(0)
  const smoothProgress = useRef(0)

  useFrame((_, delta) => {
    if (!active || usePortalStore.getState().isClosing || (id === 'album' && !useAlbumState.getState().entryReady)) return
    const next = THREE.MathUtils.damp(smoothProgress.current, targetProgress.current, 6, delta)
    if (Math.abs(next - smoothProgress.current) < 0.00001) return
    smoothProgress.current = next
    onProgress(next)
  })

  useEffect(() => {
    const nested = scroll.el
    const outer = document.querySelector<HTMLElement>('[data-scroll-owner="outer"]')
    const syncProgress = () => {
      const maxScroll = nested.scrollHeight - nested.clientHeight
      const progress = maxScroll > 0 ? Math.min(Math.max(nested.scrollTop / maxScroll, 0), 1) : 0
      targetProgress.current = progress
    }
    const redirectWheel = (event: WheelEvent) => {
      if (usePortalStore.getState().isClosing) { event.preventDefault(); return }
      if (id === 'album' && !useAlbumState.getState().entryReady) { event.preventDefault(); return }
      // The album's contact sheet owns its own overflow; an open photograph
      // holds the journey in place. Other portals retain the existing contract.
      if (id === 'album') {
        if (event.target instanceof Element && event.target.closest('.drift-ui__index, .drift-ui__credits')) return
        if (document.querySelector('[data-album-focused="true"]')) {
          event.preventDefault()
          return
        }
      }
      event.preventDefault()
      nested.scrollTop += event.deltaY
    }
    // Drei exposes the mutable nested layer; this mirrors its own ScrollControls API.
    // eslint-disable-next-line react-hooks/immutability
    nested.dataset.scrollOwner = id

    if (active) {
      targetProgress.current = 0
      smoothProgress.current = 0
      nested.scrollTop = 0
      nested.tabIndex = -1
      nested.focus({ preventScroll: true })
      nested.style.zIndex = '2'
      nested.style.pointerEvents = 'auto'
      nested.style.overscrollBehavior = 'contain'
      nested.style.touchAction = 'pan-y'
      if (outer) {
        outer.style.zIndex = '-1'
        outer.style.pointerEvents = 'none'
      }
      onProgress(0)
      nested.addEventListener('scroll', syncProgress, { passive: true })
      window.addEventListener('wheel', redirectWheel, { capture: true, passive: false })
    } else {
      targetProgress.current = 0
      smoothProgress.current = 0
      nested.scrollTop = 0
      nested.style.zIndex = '-1'
      nested.style.pointerEvents = 'none'
      onProgress(0)

      if (!usePortalStore.getState().activePortalId && outer) {
        outer.style.zIndex = '1'
        outer.style.pointerEvents = 'auto'
      }
    }

    return () => {
      nested.removeEventListener('scroll', syncProgress)
      window.removeEventListener('wheel', redirectWheel, { capture: true })
      delete nested.dataset.scrollOwner
      nested.style.zIndex = '-1'
      nested.style.pointerEvents = 'none'
    }
  }, [active, id, onProgress, scroll])

  return null
}

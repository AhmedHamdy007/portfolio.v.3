import { useScroll } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { usePortalStore, useScrollStore } from '@/store'
import { useAlbumState } from '@/components/experience/album/albumState'

export function OuterScrollLayer() {
  const scroll = useScroll()
  const connected = useThree(state => state.events.connected)
  const connect = useThree(state => state.events.connect)
  const active = usePortalStore(state => state.activePortalId)

  useLayoutEffect(() => {
    // One owner changes the homepage layer. Hiding pointer events alone does
    // not stop keyboard scrolling or wheel chaining behind a portal.
    const element = scroll.el
    // Projects uses the outer event surface for tile clicks/panning, but not
    // its scrollbar. Keep that event surface alive while locking native scroll.
    const receivesPointer = !active || active === 'projects'
    const previous = {
      overflowY: element.style.overflowY, touchAction: element.style.touchAction,
      overscrollBehavior: element.style.overscrollBehavior,
      zIndex: element.style.zIndex, pointerEvents: element.style.pointerEvents,
    }
    Object.assign(element.style, {
      overflowY: active ? 'hidden' : 'auto', touchAction: active ? 'none' : 'pan-y',
      overscrollBehavior: 'contain', zIndex: receivesPointer ? '1' : '-1',
      pointerEvents: receivesPointer ? 'auto' : 'none',
    })
    return () => { Object.assign(element.style, previous) }
  }, [active, scroll])

  useEffect(() => {
    // Deferred nested ScrollControls connect themselves on mount. Keep the
    // homepage's event source until a portal is actually entered.
    if ((!active || active === 'projects') && connected !== scroll.el) connect?.(scroll.el)
  }, [active, connected, connect, scroll])

  useEffect(() => {
    if (!active) return
    const element = scroll.el
    const offset = scroll.offset
    let width = element.clientWidth, height = element.clientHeight
    let resized = false
    const observer = new ResizeObserver(() => {
      if (width === element.clientWidth && height === element.clientHeight) return
      width = element.clientWidth; height = element.clientHeight
      resized = true
      element.scrollTop = offset * (element.scrollHeight - element.clientHeight)
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
      if (!resized) return
      // Drei exposes imperative scroll state. Keep the restored camera and
      // its scroll target aligned after orientation/viewport changes.
      element.scrollTop = offset * (element.scrollHeight - element.clientHeight)
      // Drei 10 exposes this target ref at runtime but omits it from its type.
      const internal = scroll as typeof scroll & { scroll?: { current: number } }
      if (internal.scroll) Object.assign(internal.scroll, { current: offset })
      Object.assign(scroll, { offset, delta: 0 })
    }
  }, [active, scroll])

  useEffect(() => {
    const element = scroll.el
    // Drei exposes the mutable scroll layer; ownership is coordinated through it.
    // eslint-disable-next-line react-hooks/immutability
    element.dataset.scrollOwner = 'outer'

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
  const closing = usePortalStore(state => state.isClosing)
  const albumLocked = useAlbumState(state => !state.entryReady || state.selected !== null || state.indexOpen)

  useFrame((_, delta) => {
    const portal = usePortalStore.getState()
    const album = useAlbumState.getState()
    if (!active || portal.activePortalId !== id || portal.isClosing || (id === 'album' && (!album.entryReady || album.selected !== null || album.indexOpen))) return
    const next = THREE.MathUtils.damp(smoothProgress.current, targetProgress.current, 6, delta)
    // Even a stationary scrollbar must reclaim progress after a world handoff.
    // Otherwise a single stale outer write can strand a new visit at its end.
    if (Math.abs(next - smoothProgress.current) < 0.00001 && Math.abs(next - useScrollStore.getState().scrollProgress) < 0.00001) return
    smoothProgress.current = next
    onProgress(next)
  })

  useEffect(() => {
    const nested = scroll.el
    const syncProgress = () => {
      const maxScroll = nested.scrollHeight - nested.clientHeight
      const progress = maxScroll > 0 ? Math.min(Math.max(nested.scrollTop / maxScroll, 0), 1) : 0
      targetProgress.current = progress
    }
    const redirectWheel = (event: WheelEvent) => {
      const portal = usePortalStore.getState()
      if (event.ctrlKey || event.defaultPrevented || portal.activePortalId !== id || portal.isClosing) return
      if (id === 'album' && !useAlbumState.getState().entryReady) return
      // The album's contact sheet owns its own overflow; an open photograph
      // holds the journey in place. Other portals retain the existing contract.
      if (id === 'album') {
        if (event.target instanceof Element && event.target.closest('.drift-ui__index, .drift-ui__credits')) return
        const album = useAlbumState.getState()
        if (album.selected !== null || album.indexOpen) return
      }
      // Let the browser scroll its own layer on the compositor thread. Only
      // forward wheel input that lands on the separate HTML chrome.
      if (event.target instanceof Node && nested.contains(event.target)) return
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? nested.clientHeight : 1
      nested.scrollTop += event.deltaY * unit
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
      onProgress(0)
      nested.addEventListener('scroll', syncProgress, { passive: true })
      window.addEventListener('wheel', redirectWheel, { passive: true })
    } else {
      targetProgress.current = 0
      smoothProgress.current = 0
      nested.scrollTop = 0
      nested.style.zIndex = '-1'
      nested.style.pointerEvents = 'none'
    }

    return () => {
      nested.removeEventListener('scroll', syncProgress)
      window.removeEventListener('wheel', redirectWheel)
      delete nested.dataset.scrollOwner
      nested.style.zIndex = '-1'
      nested.style.pointerEvents = 'none'
    }
  }, [active, id, onProgress, scroll])

  useEffect(() => {
    const element = scroll.el
    const locked = !active || closing || (id === 'album' && albumLocked)
    // CSS locking also covers touch and keyboard, without a blocking wheel listener.
    Object.assign(element.style, { overflowY: locked ? 'hidden' : 'auto', touchAction: locked ? 'none' : 'pan-y' })
  }, [active, closing, albumLocked, id, scroll])

  return null
}

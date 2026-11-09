import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { usePortalStore, useScrollStore } from '@/store'
import { useAlbumState } from './albumState'
import { createMemoryLayerGeometry } from './memoryLayerGeometry'

const NO_RAYCAST = () => {}

/** A brief glimpse beneath the archive, without moving any existing photos. */
export default function MemoryLayers({ mobile, reduced }: { mobile: boolean; reduced: boolean }) {
  const rootRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>(null)
  const inlayRef = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>(null)
  const resources = useMemo(() => ({
    ...createMemoryLayerGeometry(mobile),
    metal: new THREE.MeshStandardMaterial({
      // Green-tinted satin silver stays readable from above and below. The
      // previous dark, strongly metallic base swallowed the studio lighting.
      color: '#b7beae', metalness: 0.42, roughness: 0.34,
      envMapIntensity: 1.12, transparent: true, opacity: 0,
      depthWrite: false, forceSinglePass: true,
    }),
    champagne: new THREE.MeshStandardMaterial({
      color: '#d8c49d', metalness: 0.76, roughness: 0.23,
      envMapIntensity: 1.25, transparent: true, opacity: 0,
      depthWrite: false, forceSinglePass: true,
    }),
  }), [mobile])

  useEffect(() => () => {
    resources.body.dispose()
    resources.inlay.dispose()
    resources.metal.dispose()
    resources.champagne.dispose()
  }, [resources])

  useFrame(() => {
    const root = rootRef.current
    const body = bodyRef.current
    const inlay = inlayRef.current
    if (!root || !body || !inlay) return
    const portal = usePortalStore.getState()
    // The outer portal owns the closing shot. Freeze its current contents.
    if (portal.activePortalId === 'album' && portal.isClosing) return
    const p = useScrollStore.getState().scrollProgress
    root.visible = portal.activePortalId === 'album' && !reduced && p > 0.64 && p < 0.86
    if (!root.visible) return
    const appear = THREE.MathUtils.smootherstep(p, 0.64, 0.67)
    const disappear = 1 - THREE.MathUtils.smootherstep(p, 0.83, 0.86)
    const focus = useAlbumState.getState().selected === null ? 1 : 0.1
    const opacity = appear * disappear * focus
    // Geometry is static. All perceived motion comes from the shared camera;
    // no extra damping loop, idle spin, rebuilding, or per-frame allocations.
    body.material.opacity = opacity
    inlay.material.opacity = opacity
    // The held shot is genuinely opaque: overlapping masks occlude correctly.
    // Disable depth writes only through the smooth entry/exit/focus dissolves.
    body.material.depthWrite = opacity > 0.995
    inlay.material.depthWrite = opacity > 0.995
  })

  return <group ref={rootRef} visible={false} dispose={null}>
    <mesh ref={bodyRef} geometry={resources.body} material={resources.metal} raycast={NO_RAYCAST} />
    <mesh ref={inlayRef} geometry={resources.inlay} material={resources.champagne} raycast={NO_RAYCAST} />
  </group>
}

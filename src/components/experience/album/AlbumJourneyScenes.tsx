import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js'
import * as THREE from 'three'
import { useScrollStore } from '@/store'
import AlbumAssetBoundary from './AlbumAssetBoundary'

// Lazy-imported on album entry: story assets do not delay the homepage.
const PATHS = [
  '/models/space_boi.glb',
  '/models/24_dizzying_space_travel_-_inktober2019.glb',
  '/models/space_ame_camping_-_amelia_watson_hololive.glb',
  '/models/tilt_brush_-_falling.glb',
] as const

function StoryModel({ kind, reduced, mobile }: { kind: 0 | 1 | 2 | 3; reduced: boolean; mobile: boolean }) {
  const { scene, animations } = useGLTF(PATHS[kind])
  const root = useRef<THREE.Group>(null)
  const gl = useThree(state => state.gl)
  const camera = useThree(state => state.camera)
  const lightingScene = useThree(state => state.scene)
  const compiled = useRef(false)
  const reveal = useRef(0)
  const asset = useMemo(() => {
    // Preserve bone bindings, cached geometry, original textures and animation.
    const clone = cloneSkeleton(scene)
    clone.updateMatrixWorld(true)
    const box = new THREE.Box3()
    const materials: { material: THREE.Material; opacity: number }[] = []
    const materialCache = new Map<THREE.Material, THREE.Material>()
    clone.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return
      object.raycast = () => {}
      const sources: THREE.Material[] = Array.isArray(object.material) ? object.material : [object.material]
      // The download includes a giant spherical sky and a glow billboard.
      // Our shared space backdrop replaces those, not the campsite itself.
      if (kind === 2 && sources.some(material => ['Material.002', 'spaceglow'].includes(material.name))) object.visible = false
      // Isolate the downloaded vortex; its spacecraft would compete with the pair.
      if (kind === 1 && sources.some(material => material.name !== 'Vortex')) object.visible = false
      const replacements = sources.map(source => {
        let material = materialCache.get(source)
        if (!material) {
          material = source.clone()
          materialCache.set(source, material)
          materials.push({ material, opacity: source.opacity * (source.name === 'smoke' ? 0.22 : 1) })
          material.transparent = true
          if (source.name === 'smoke') material.depthWrite = false
          material.toneMapped = kind === 2
          if (material instanceof THREE.MeshStandardMaterial && kind === 2) material.emissiveIntensity = 0.65
          if (kind === 1) { material.side = THREE.DoubleSide; material.depthWrite = false }
        }
        return material
      })
      object.material = Array.isArray(object.material) ? replacements : replacements[0]
      // Frame the subject, not the oversized stage or atmospheric shell.
      const isSubject = kind === 0 ? object.name.startsWith('body_')
        : kind === 2 ? sources.some(material => material.name === 'moon') : true
      if (isSubject) box.expandByObject(object)
    })
    if (box.isEmpty()) box.setFromObject(clone)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const wrapper = new THREE.Group()
    const centered = new THREE.Group()
    centered.position.copy(center).negate()
    centered.add(clone)
    wrapper.add(centered)
    wrapper.scale.setScalar(1 / (kind === 0 ? size.y : Math.max(size.x, size.y, size.z)))
    return { wrapper, clone, materials }
  }, [scene, kind])
  const { actions, mixer } = useAnimations(animations, asset.clone)
  useEffect(() => {
    let cancelled = false
    compiled.current = false
    // Compile using the portal's actual lights before the model's first draw.
    // KHR_parallel_shader_compile avoids synchronously waiting on GPU programs.
    void gl.compileAsync(asset.wrapper, camera, lightingScene).catch(error => {
      console.warn('Album shader warm-up unavailable; falling back to normal rendering.', error)
    }).then(() => { if (!cancelled) compiled.current = true })
    return () => { cancelled = true }
  }, [asset, camera, gl, lightingScene])
  useEffect(() => {
    Object.values(actions).forEach(action => {
      if (action) { action.reset().play(); action.setEffectiveTimeScale(kind === 1 ? 0.35 : 0.7) }
    })
    return () => { mixer.stopAllAction() }
  }, [actions, kind, mixer])
  useEffect(() => () => asset.materials.forEach(({ material }) => material.dispose()), [asset])
  useFrame((_, delta) => {
    const p = useScrollStore.getState().scrollProgress
    const visibility = kind === 0 ? 1 - THREE.MathUtils.smoothstep(p, 0.12, 0.2)
      : kind === 1 ? THREE.MathUtils.smoothstep(p, 0.15, 0.2) * (1 - THREE.MathUtils.smoothstep(p, 0.39, 0.425))
      : kind === 2 ? THREE.MathUtils.smoothstep(p, 0.77, 0.87)
      : THREE.MathUtils.smoothstep(p, 0.16, 0.21) * (1 - THREE.MathUtils.smoothstep(p, 0.355, 0.385))
    reveal.current = THREE.MathUtils.damp(reveal.current, compiled.current ? 1 : 0, 5, Math.min(delta, 0.05))
    if (root.current) root.current.visible = compiled.current && visibility > 0.002
    // The couple is a stationary tableau. Only the camera travels around and
    // past them; their apparent motion comes from real perspective/parallax.
    asset.materials.forEach(({ material, opacity }) => { material.opacity = opacity * visibility * reveal.current })
    Object.values(actions).forEach(action => { if (action) action.paused = reduced || visibility < 0.002 })
  })
  const positions: [number, number, number][] = [[3, 6, 12], [0, -5, 5], [-10, -10, -28], [mobile ? 0.35 : 0, 0.2, 10]]
  const rotations: [number, number, number][] = [[0, -0.45, 0], [-0.5, 0, 0], [0, 0.4, 0], [0.23, Math.PI + 0.2, -0.04]]
  return <group ref={root} visible={false} position={positions[kind]} rotation={rotations[kind]} scale={[5.2, 30, 20, mobile ? 4.2 : 5.5][kind]}>
    <primitive object={asset.wrapper} dispose={null} />
  </group>
}

export default function AlbumJourneyScenes({ reduced, mobile }: { reduced: boolean; mobile: boolean }) {
  // Only subscribe to a threshold, not every scroll frame. The distant campsite
  // is not part of the opening network/decode burst; prefetch before its chapter.
  const [nearAfterglow, setNearAfterglow] = useState(() => useScrollStore.getState().scrollProgress > 0.58)
  useEffect(() => {
    if (nearAfterglow) return
    return useScrollStore.subscribe(state => {
      // Latch once, then unsubscribe: never rebuild on reverse scrolling.
      if (state.scrollProgress > 0.58) setNearAfterglow(true)
    })
  }, [nearAfterglow])
  return <>
    {([0, 1, 3] as const).map(kind => <AlbumAssetBoundary key={kind} name={PATHS[kind]}>
      <Suspense fallback={null}><StoryModel kind={kind} reduced={reduced} mobile={mobile} /></Suspense>
    </AlbumAssetBoundary>)}
    {nearAfterglow && <AlbumAssetBoundary name={PATHS[2]}><Suspense fallback={null}><StoryModel kind={2} reduced={reduced} mobile={mobile} /></Suspense></AlbumAssetBoundary>}
    <pointLight position={[-10, -5, -24]} color="#ffe0b9" intensity={80} distance={20} />
  </>
}

import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { usePortalStore, useScrollStore } from '@/store'
import { useAlbumState } from './albumState'
import { albumStoryProgress } from './layerJourney'

const NO_RAYCAST = () => {}
const WARM_METAL = new THREE.Color('#aaa18b')
const DUSK_METAL = new THREE.Color('#637570')
const WARM_EDGE = new THREE.Color('#e3c58b')
const DUSK_EDGE = new THREE.Color('#7c9d97')

/** One open, axial foil vault. Repeated around Z, never across the camera path. */
function foilPoint(u: number, v: number, out: THREE.Vector3) {
  const radius = 7.3 + Math.sin(v * Math.PI) * 1.1 - v * 1.6
  const angle = (u - 0.5) * 0.66 + Math.sin(v * Math.PI) * 0.5 + v * 0.45
  return out.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 10 - v * 25)
}

function createFoilGeometry(mobile: boolean) {
  const lengthSegments = mobile ? 40 : 80
  const widthSegments = mobile ? 3 : 6
  const geometry = new THREE.PlaneGeometry(1, 1, widthSegments, lengthSegments)
  const positions = geometry.attributes.position
  const uv = geometry.attributes.uv
  const point = new THREE.Vector3()
  for (let i = 0; i < positions.count; i++) {
    foilPoint(uv.getX(i), uv.getY(i), point)
    positions.setXYZ(i, point.x, point.y, point.z)
  }
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function createEdgeGeometry(mobile: boolean) {
  const point = new THREE.Vector3()
  const pieces = [0, 1].map(edge => {
    const points = Array.from({ length: 25 }, (_, i) => foilPoint(edge, i / 24, point).clone())
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), mobile ? 32 : 64, 0.018, 4, false)
  })
  const geometry = mergeGeometries(pieces)
  pieces.forEach(piece => piece.dispose())
  return geometry
}

/**
 * The impossible interior is made from photographic material: oversized foil,
 * sprocket holes and restrained warm seams, rather than floating sci-fi rings.
 * Two instanced draws, no textures, no extra lights or render targets.
 */
export default function MemoryChamber({ mobile, reduced }: { mobile: boolean; reduced: boolean }) {
  const rootRef = useRef<THREE.Group>(null)
  const foilRef = useRef<THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>(null)
  const edgeRef = useRef<THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>>(null)
  const count = mobile ? 4 : 6
  const opacityRef = useRef(0)
  const resources = useMemo(() => {
    const foilGeometry = createFoilGeometry(mobile)
    const edgeGeometry = createEdgeGeometry(mobile)
    const foil = new THREE.MeshStandardMaterial({
      color: WARM_METAL, metalness: 0.84, roughness: 0.4,
      envMapIntensity: 0.46, transparent: true, opacity: 0,
      side: THREE.DoubleSide, depthWrite: false, forceSinglePass: true,
    })
    // UV-defined perforations do not need hundreds of little meshes. The
    // brushed grain is static, so it does not shimmer with elapsed time.
    foil.onBeforeCompile = shader => {
      shader.vertexShader = `varying vec2 vFoilUv;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>', '#include <begin_vertex>\nvFoilUv = uv;',
      )
      shader.fragmentShader = `varying vec2 vFoilUv;\n${shader.fragmentShader}`.replace(
        '#include <color_fragment>', `#include <color_fragment>
          float longitudinal = abs(fract(vFoilUv.y * 44.0) - 0.5);
          float edgeDistance = min(abs(vFoilUv.x - 0.095), abs(vFoilUv.x - 0.905));
          vec2 hole = vec2(edgeDistance * 4.0, longitudinal * 0.33) - vec2(0.14, 0.09);
          float roundedHole = length(max(hole, 0.0)) + min(max(hole.x, hole.y), 0.0) - 0.024;
          if (roundedHole < 0.0) discard;
          float brush = sin(vFoilUv.x * 1400.0 + sin(vFoilUv.y * 23.0));
          float edgeLight = pow(abs(vFoilUv.x - 0.5) * 2.0, 5.0);
          diffuseColor.rgb *= 0.52 + brush * 0.013 + edgeLight * 0.34;
        `,
      )
    }
    foil.customProgramCacheKey = () => 'memory-chamber-foil-v1'
    const edge = new THREE.MeshBasicMaterial({
      color: WARM_EDGE, transparent: true, opacity: 0,
      depthWrite: false, toneMapped: false,
    })
    return { foilGeometry, edgeGeometry, foil, edge }
  }, [mobile])

  useLayoutEffect(() => {
    const foil = foilRef.current
    const edge = edgeRef.current
    if (!foil || !edge) return
    const matrix = new THREE.Matrix4()
    for (let i = 0; i < count; i++) {
      matrix.makeRotationZ(i / count * Math.PI * 2 + 0.14)
      foil.setMatrixAt(i, matrix)
      edge.setMatrixAt(i, matrix)
    }
    foil.instanceMatrix.needsUpdate = true
    edge.instanceMatrix.needsUpdate = true
    foil.computeBoundingSphere()
    edge.computeBoundingSphere()
    return () => { foil.dispose(); edge.dispose() }
  }, [count, resources])

  useEffect(() => () => {
    resources.foilGeometry.dispose()
    resources.edgeGeometry.dispose()
    resources.foil.dispose()
    resources.edge.dispose()
  }, [resources])

  useFrame((_, delta) => {
    const root = rootRef.current
    const foil = foilRef.current
    const edge = edgeRef.current
    if (!root || !foil || !edge) return
    const portal = usePortalStore.getState()
    const raw = useScrollStore.getState().scrollProgress
    const p = albumStoryProgress(raw)
    // Freeze the local scene while GridTile performs its shared-camera exit.
    if (portal.activePortalId === 'album' && portal.isClosing) return
    root.visible = portal.activePortalId === 'album' && !reduced && p > 0.285 && p < 0.916
    if (!root.visible) { opacityRef.current = 0; return }
    const appear = THREE.MathUtils.smootherstep(p, 0.29, 0.46)
    const collapse = THREE.MathUtils.smootherstep(p, 0.82, 0.91)
    const disappear = 1 - THREE.MathUtils.smootherstep(p, 0.86, 0.915)
    const dusk = THREE.MathUtils.smootherstep(p, 0.76, 0.9)
    const gallery = THREE.MathUtils.smootherstep(p, 0.55, 0.64) * (1 - THREE.MathUtils.smootherstep(p, 0.8, 0.85))
    const layer = THREE.MathUtils.smootherstep(raw, 0.64, 0.67) * (1 - THREE.MathUtils.smootherstep(raw, 0.815, 0.84))
    const focus = (useAlbumState.getState().selected === null ? 1 : 0.12) * (1 - layer)
    opacityRef.current = THREE.MathUtils.damp(opacityRef.current, appear * disappear * focus, 10, Math.min(delta, 0.05))
    const scale = THREE.MathUtils.lerp(1.08, 1, appear) * (1 - collapse * 0.92)
    root.scale.set(scale, scale * 0.88, 1 - collapse * 0.75)
    root.rotation.set(0, 0, -0.12 + collapse * 1.25)
    foil.material.color.lerpColors(WARM_METAL, DUSK_METAL, dusk)
    edge.material.color.lerpColors(WARM_EDGE, DUSK_EDGE, dusk)
    // The room establishes scale, then steps back while actual photographs
    // are being browsed. Architecture must not compete with the collection.
    foil.material.opacity = opacityRef.current * 0.46 * (1 - gallery * 0.76)
    edge.material.opacity = opacityRef.current * (mobile ? 0.2 : 0.28) * (1 - gallery * 0.7)
  })

  return <group ref={rootRef} position={[0, 0, -18]} visible={false} dispose={null}>
    <instancedMesh ref={foilRef} args={[resources.foilGeometry, resources.foil, count]} renderOrder={-5} raycast={NO_RAYCAST} frustumCulled={false} />
    <instancedMesh ref={edgeRef} args={[resources.edgeGeometry, resources.edge, count]} renderOrder={-4} raycast={NO_RAYCAST} frustumCulled={false} />
  </group>
}

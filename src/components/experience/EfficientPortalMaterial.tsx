/* Portal coordinate/blending approach adapted from @react-three/drei.
 * MIT License, Copyright (c) 2020 react-spring. See /licenses/portal.txt.
 * This deliberately supports our sharp-edged portals only (no SDF blur).
 */
import { RenderTexture, useFBO } from '@react-three/drei'
import { useFrame, useThree, type RootState } from '@react-three/fiber'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useState, type ReactNode, type RefObject } from 'react'
import * as THREE from 'three'
import { FullScreenQuad } from 'three-stdlib'
import { PortalActivity } from './portalActivity'
import { useLoadingState } from '@/components/chrome/loadingState'
import { registerPortalWarmup, warmPortalScene } from './portalWarmup'

class PortalSurface extends THREE.ShaderMaterial {
  blend = 0
  constructor() {
    super({
      side: THREE.DoubleSide,
      uniforms: { map: { value: null }, resolution: { value: new THREE.Vector2() } },
      vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D map; uniform vec2 resolution;
        void main() {
          gl_FragColor = texture2D(map, gl_FragCoord.xy / resolution);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    })
  }
}

interface Props { children: ReactNode; parent: RefObject<THREE.Mesh | null>; anchor: RefObject<THREE.Group | null>; visible: boolean }

/** Keep live previews and the same blend, without rendering the portal twice. */
const EfficientPortalMaterial = forwardRef<PortalSurface, Props>(function EfficientPortalMaterial({ children, parent: parentRef, anchor, visible }, forwardedRef) {
  const rootScene = useThree(state => state.scene)
  const size = useThree(state => state.size)
  const dpr = useThree(state => state.viewport.dpr)
  const [surface] = useState(() => new PortalSurface())
  const [phase, setPhase] = useState(0)
  const loading = useLoadingState(state => state.phase === 'loading')
  useImperativeHandle(forwardedRef, () => surface, [surface])
  useEffect(() => () => surface.dispose(), [surface])
  useFrame(() => {
    surface.uniforms.resolution.value.set(size.width * dpr, size.height * dpr)
    const next = surface.blend === 0 ? 0 : surface.blend === 1 ? 2 : 1
    if (phase !== next) setPhase(next)
  })
  const compute = useCallback((event: { offsetX: number; offsetY: number }, state: RootState) => {
    if (!parentRef.current) return false
    state.pointer.set(event.offsetX / state.size.width * 2 - 1, -(event.offsetY / state.size.height) * 2 + 1)
    state.raycaster.setFromCamera(state.pointer, state.camera)
    if (surface.blend === 0 && !state.raycaster.intersectObject(parentRef.current, false).length) {
      Object.assign(state.raycaster, { camera: undefined })
      return false
    }
  }, [parentRef, surface])
  return <primitive object={surface} attach="material">
    <RenderTexture attach="uniforms-map-value" samples={2} frames={phase === 2 ? 0 : visible || phase === 1 ? Infinity : loading ? 1 : 0} compute={compute}>
      <PortalActivity.Provider value={visible || phase > 0}>{children}</PortalActivity.Provider>
      <PortalRenderer parent={anchor} surface={surface} rootScene={rootScene} priority={phase > 0 ? 1 : 0} />
    </RenderTexture>
  </primitive>
})

function PortalRenderer({ parent, surface, rootScene, priority }: { parent: Props['anchor']; surface: PortalSurface; rootScene: THREE.Scene; priority: number }) {
  const scene = useThree(state => state.scene)
  const gl = useThree(state => state.gl)
  useLayoutEffect(() => registerPortalWarmup(gl, async cancelled => {
    if (!parent.current || cancelled()) return
    parent.current.updateWorldMatrix(true, false)
    scene.matrixWorld.copy(parent.current.matrixWorld)
    await warmPortalScene(gl, scene, cancelled)
  }), [gl, scene, parent])
  // Only the root-world blend buffer is needed: the portal texture already exists.
  const world = useFBO()
  const quad = useMemo(() => new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: { portal: { value: null }, world: { value: world.texture }, blend: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D portal; uniform sampler2D world; uniform float blend; varying vec2 vUv;
      void main() {
        gl_FragColor = mix(texture2D(world, vUv), texture2D(portal, vUv), blend);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    depthTest: false, depthWrite: false,
  })), [world])
  useEffect(() => () => { quad.material.dispose(); quad.dispose() }, [quad])
  useLayoutEffect(() => { scene.matrixAutoUpdate = false }, [scene])
  useFrame(() => {
    if (!parent.current) return
    parent.current.updateWorldMatrix(true, false)
    scene.matrixWorld.copy(parent.current.matrixWorld)
  }, -2)
  useFrame(({ gl, camera }) => {
    if (!priority) return
    const blend = surface.blend
    if (blend === 1) { gl.render(scene, camera); return }
    if (blend <= 0) { gl.render(rootScene, camera); return }
    const previousTarget = gl.getRenderTarget()
    try {
      gl.setRenderTarget(world)
      gl.render(rootScene, camera)
      gl.setRenderTarget(previousTarget)
      const uniforms = (quad.material as THREE.ShaderMaterial).uniforms
      uniforms.portal.value = surface.uniforms.map.value
      uniforms.blend.value = blend
      quad.render(gl)
    } finally { gl.setRenderTarget(previousTarget) }
  }, priority)
  return null
}

export default EfficientPortalMaterial

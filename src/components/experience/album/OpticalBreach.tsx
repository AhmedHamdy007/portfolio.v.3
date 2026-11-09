import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { usePortalStore, useScrollStore } from '@/store'
import { useAlbumState } from './albumState'
import { albumStoryProgress } from './layerJourney'

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
  }
`
const fragment = /* glsl */ `
  uniform sampler2D uScene;
  uniform float uStrength;
  uniform float uProgress;
  uniform float uAspect;
  varying vec2 vUv;
  void main() {
    vec2 centre = vUv - 0.5;
    vec2 lens = centre * vec2(uAspect, 1.0);
    float radius = length(lens);
    float envelope = uStrength * smoothstep(0.04, 0.65, radius);
    float ripple = sin(radius * 15.0 - uProgress * 8.0) * 0.006;
    vec2 refracted = 0.5 + centre * (1.0 - envelope * 0.13 + ripple * uStrength);
    vec2 split = centre * envelope * 0.0035;
    vec3 color = vec3(
      texture2D(uScene, clamp(refracted + split, 0.001, 0.999)).r,
      texture2D(uScene, clamp(refracted, 0.001, 0.999)).g,
      texture2D(uScene, clamp(refracted - split, 0.001, 0.999)).b
    );
    // An optical impression, not a physical caustics simulation. Broad bands
    // avoid flashes; the image itself remains visible through the glass.
    float band = pow(0.5 + 0.5 * cos(radius * 19.0 - uProgress * 6.0), 12.0);
    color += vec3(0.18, 0.135, 0.065) * band * uStrength * smoothstep(0.15, 0.7, radius);
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

/** Local capture only at the glass crossing. MeshPortalMaterial still owns
 * the final render; there is no second composer or positive frame priority. */
export default function OpticalBreach({ mobile, reduced }: { mobile: boolean; reduced: boolean }) {
  const ref = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>>(null)
  const { size } = useThree()
  const target = useMemo(() => new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    type: THREE.HalfFloatType, depthBuffer: true, stencilBuffer: false,
  }), [])
  const uniforms = useMemo(() => ({
    uScene: { value: target.texture }, uStrength: { value: 0 },
    uProgress: { value: 0 }, uAspect: { value: 1 },
  }), [target])
  useLayoutEffect(() => {
    // CSS-pixel budget, independent of DPR. The brief soft crossing does not
    // need a second full-resolution framebuffer on high-density devices.
    const scale = Math.min(mobile ? 0.5 : 0.7, 1000 / size.width)
    Object.assign(target, { samples: mobile ? 0 : 2 })
    target.setSize(Math.max(1, Math.round(size.width * scale)), Math.max(1, Math.round(size.height * scale)))
  }, [target, size.width, size.height, mobile])
  useEffect(() => () => target.dispose(), [target])
  useFrame(({ gl, scene, camera }) => {
    const mesh = ref.current
    if (!mesh) return
    const portal = usePortalStore.getState()
    const album = useAlbumState.getState()
    const p = albumStoryProgress(useScrollStore.getState().scrollProgress)
    const entering = THREE.MathUtils.smootherstep(p, 0.285, 0.335) * (1 - THREE.MathUtils.smootherstep(p, 0.35, 0.405))
    const leaving = THREE.MathUtils.smootherstep(p, 0.928, 0.94) * (1 - THREE.MathUtils.smootherstep(p, 0.95, 0.961))
    const strength = Math.max(entering, leaving * 0.6)
    mesh.visible = false
    if (reduced || portal.activePortalId !== 'album' || portal.isClosing || !album.entryReady || album.selected !== null || strength < 0.001) return
    mesh.material.uniforms.uStrength.value = strength
    mesh.material.uniforms.uProgress.value = p * 4
    mesh.material.uniforms.uAspect.value = size.width / size.height
    const previousTarget = gl.getRenderTarget()
    const previousFace = gl.getActiveCubeFace()
    const previousMip = gl.getActiveMipmapLevel()
    const previousClear = gl.autoClear
    const previousScissorTest = gl.getScissorTest()
    try {
      gl.setRenderTarget(target)
      gl.setScissorTest(false)
      gl.autoClear = true
      gl.render(scene, camera)
    } finally {
      gl.setRenderTarget(previousTarget, previousFace, previousMip)
      gl.setScissorTest(previousScissorTest)
      gl.autoClear = previousClear
    }
    mesh.visible = true
  })
  return <mesh ref={ref} visible={false} frustumCulled={false} raycast={() => {}} renderOrder={100}>
    <planeGeometry />
    <shaderMaterial uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment}
      depthTest={false} depthWrite={false} toneMapped={false} transparent />
  </mesh>
}

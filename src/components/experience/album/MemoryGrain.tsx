import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { usePortalStore, useScrollStore } from '@/store'
import { useAlbumState } from './albumState'
import { albumStoryProgress } from './layerJourney'

const grainVertex = /* glsl */`
  attribute vec3 aSeed;
  uniform float uTime;
  uniform float uAttraction;
  uniform float uPixelRatio;
  varying float vOpacity;

  void main() {
    float pull = smoothstep(aSeed.z * 0.16, 0.80 + aSeed.z * 0.20, uAttraction);
    vec3 p = position;
    float drift = uTime * (0.12 + aSeed.x * 0.055) + aSeed.y;
    p.xy += vec2(sin(drift), cos(drift * 0.81)) * 0.11;
    float turn = pull * 0.65;
    p.xy = mat2(cos(turn), -sin(turn), sin(turn), cos(turn)) * p.xy;
    p = mix(p, vec3(0.0, 0.0, 1.4), pull);

    vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    float perspective = 10.0 / max(1.0, -viewPosition.z);
    gl_PointSize = clamp((1.2 + aSeed.x * 2.1) * perspective, 1.0, 6.0) * uPixelRatio;
    // Grains disappear individually before converging into an artificial bright dot.
    vOpacity = (0.6 + aSeed.x * 0.4) * (1.0 - smoothstep(0.65, 1.0, pull));
    vOpacity *= smoothstep(0.25, 1.5, -viewPosition.z);
  }
`

const grainFragment = /* glsl */`
  uniform vec3 uSilver;
  uniform float uOpacity;
  varying float vOpacity;

  void main() {
    float radius = length(gl_PointCoord - vec2(0.5));
    float falloff = 1.0 - smoothstep(0.04, 0.5, radius);
    float alpha = falloff * falloff * vOpacity * uOpacity;
    if (alpha < 0.008) discard;
    gl_FragColor = vec4(uSilver, alpha);
    #include <colorspace_fragment>
  }
`

const ignoreRaycast = () => {}

/** Silver grain belongs to the lens approach, not to an infinite background sky. */
export default function MemoryGrain({ mobile, reduced }: { mobile: boolean; reduced: boolean }) {
  const points = useRef<THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>>(null)
  const resources = useMemo(() => {
    const count = mobile ? 60 : 180
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count * 3)
    let seed = 1618033
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed / 4294967296
    }
    for (let index = 0; index < count; index++) {
      const angle = random() * Math.PI * 2
      const radius = 1.7 + Math.sqrt(random()) * 3.8
      const scale = mobile ? 0.64 : 1
      positions[index * 3] = Math.cos(angle) * radius * scale
      positions[index * 3 + 1] = Math.sin(angle) * radius * 0.7 * scale
      positions[index * 3 + 2] = 2.2 + random() * 5.0
      seeds[index * 3] = random()
      seeds[index * 3 + 1] = random() * Math.PI * 2
      seeds[index * 3 + 2] = random()
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3))
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAttraction: { value: 0 },
        uPixelRatio: { value: 1 },
        uOpacity: { value: 0.4 },
        uSilver: { value: new THREE.Color('#d9d8cf') },
      },
      vertexShader: grainVertex,
      fragmentShader: grainFragment,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      toneMapped: false,
    })
    return { geometry, material }
  }, [mobile])

  useEffect(() => () => {
    resources.geometry.dispose()
    resources.material.dispose()
  }, [resources])

  useFrame(({ clock, gl }) => {
    const node = points.current
    if (!node) return
    const portal = usePortalStore.getState()
    const progress = albumStoryProgress(useScrollStore.getState().scrollProgress)
    node.visible = !reduced && portal.activePortalId === 'album' && progress < 0.34 && useAlbumState.getState().selected === null
    if (!node.visible) return
    const align = THREE.MathUtils.smootherstep(progress, 0.02, 0.18)
    node.position.set((mobile ? 0 : 2.75) * (1 - align), (mobile ? 2.7 : 0.1) * (1 - align), 0)
    node.rotation.set(0.16 * (1 - align), -0.4 * (1 - align), -0.16 * (1 - align))
    const uniforms = node.material.uniforms
    uniforms.uTime.value = clock.elapsedTime
    uniforms.uAttraction.value = THREE.MathUtils.smootherstep(progress, 0.05, 0.28)
    uniforms.uOpacity.value = 0.4 * (1 - THREE.MathUtils.smootherstep(progress, 0.25, 0.32))
    uniforms.uPixelRatio.value = Math.min(gl.getPixelRatio(), 2)
  })

  return <points ref={points} geometry={resources.geometry} material={resources.material}
    visible={false} frustumCulled={false} raycast={ignoreRaycast} dispose={null} />
}

import * as THREE from 'three'

/** Small, local light spill. No textures, new lights, render targets or timers. */
export function createThresholdLight(source: THREE.MeshPhysicalMaterial) {
  const geometry = new THREE.PlaneGeometry(2.6, 2.1)
  // UV y=0 is the threshold; positive world Z extends toward the visitor.
  geometry.rotateX(Math.PI / 2)
  geometry.translate(0, 0, 1.05)
  geometry.computeBoundingSphere()
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    forceSinglePass: true,
    uniforms: { uOpening: { value: 0 }, uPresence: { value: 0 }, uTint: { value: new THREE.Color('#fff4db') } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uOpening;
      uniform float uPresence;
      uniform vec3 uTint;
      varying vec2 vUv;
      void main() {
        float x = (vUv.x - 0.5) * 2.6;
        float distanceFromDoor = vUv.y * 2.1;
        // Analytic anti-aliasing keeps the seam stable on high-DPR/mobile views.
        float aa = max(fwidth(x), 0.002);
        float seamEnds = 1.0 - smoothstep(0.40, 0.435 + aa, abs(x));
        float seam = exp(-distanceFromDoor / 0.020) * seamEnds;
        // The right-hand hinge opens the gap from the left jamb. The soft wedge
        // widens with the actual leaf angle, rather than an independent timeline.
        float aperture = 0.84 * uOpening;
        float halfWidth = 0.5 * aperture + distanceFromDoor * 0.17 * uOpening;
        float center = -0.42 + 0.5 * aperture - distanceFromDoor * 0.12 * uOpening;
        float feather = 0.014 + distanceFromDoor * 0.075 + aa;
        float beam = 1.0 - smoothstep(max(0.0, halfWidth - feather), halfWidth + feather, abs(x - center));
        beam *= exp(-distanceFromDoor * 1.65) * (1.0 - smoothstep(1.1, 2.1, distanceFromDoor));
        float alpha = uPresence * (0.48 * seam + 0.20 * uOpening * beam);
        gl_FragColor = vec4(uTint, min(alpha, 0.52));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = 'Threshold daylight'
  // Window frame top is y=.0447, sill z=0. This clears the surface by .0033
  // without disabling depth testing or painting over the moving door leaf.
  mesh.position.set(0, 0.048, -0.042)
  mesh.raycast = () => {}
  const frame = source.clone(), handle = source.clone()
  const originalEmission = source.emissive.clone().multiplyScalar(source.emissiveIntensity)
  const warm = new THREE.Color('#fff4db')
  frame.emissiveIntensity = handle.emissiveIntensity = 1
  return {
    mesh, material, frame, handle, originalEmission, warm,
    dispose() { geometry.dispose(); material.dispose(); frame.dispose(); handle.dispose() },
  }
}

export function thresholdPresence(progress: number, cameraY: number) {
  const approach = THREE.MathUtils.smoothstep(progress, 0.36, 0.445)
  // Fade before the camera intersects the sill: no near-plane flash/whiteout.
  const crossing = THREE.MathUtils.smoothstep(-cameraY, 22.4, 24.1)
  return approach * (1 - crossing) * (1 - THREE.MathUtils.smoothstep(progress, 0.64, 0.68))
}

export function updateThresholdLight(
  light: ReturnType<typeof createThresholdLight>, progress: number, cameraY: number,
  leafAngle: number, handleTurn: number, portalActive: boolean, warming = false,
) {
  const presence = portalActive ? 0 : thresholdPresence(progress, cameraY)
  const opening = Math.sin(THREE.MathUtils.clamp(leafAngle, 0, Math.PI / 2))
  light.material.uniforms.uOpening.value = opening
  light.material.uniforms.uPresence.value = presence
  // Keep the transparent quad available to the existing behind-loader warm-up.
  // Once entered, it contributes no draws outside the threshold moment.
  light.mesh.visible = !portalActive && (warming || presence > 0.001)
  const glint = Math.sin(THREE.MathUtils.clamp(handleTurn, 0, 1) * Math.PI)
  light.frame.emissive.copy(light.warm).multiplyScalar(0.025 * opening * presence).add(light.originalEmission)
  light.handle.emissive.copy(light.warm).multiplyScalar((0.09 * glint + 0.025 * opening) * presence).add(light.originalEmission)
}

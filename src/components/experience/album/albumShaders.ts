export const photoVertex = /* glsl */ `
  uniform float uTime;
  uniform float uVelocity;
  uniform float uFocus;
  uniform float uPhase;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    float energy = min(abs(uVelocity), 3.0);
    float bend = sin(uv.y * 3.14159) * sin(uv.x * 3.14159);
    p.z += sin(p.y * 2.5 + uPhase + uTime * 0.45) * bend * (0.035 + energy * 0.19) * (1.0 - uFocus);
    p.x += sin(uv.y * 3.14159) * uVelocity * 0.035 * (1.0 - uFocus);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

export const photoFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uVelocity;
  uniform float uOpacity;
  uniform float uFocus;
  uniform float uImageAspect;
  uniform float uPlaneAspect;
  varying vec2 vUv;
  void main() {
    vec2 ratio = vec2(min(uPlaneAspect / uImageAspect, 1.0), min(uImageAspect / uPlaneAspect, 1.0));
    vec2 uv = (vUv - 0.5) * ratio + 0.5;
    float strength = min(abs(uVelocity) * 0.003, 0.012) * (1.0 - uFocus);
    vec2 shift = vec2(strength * 0.6, strength);
    vec3 color = vec3(texture2D(uMap, uv + shift).r, texture2D(uMap, uv).g, texture2D(uMap, uv - shift).b);
    float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float alpha = smoothstep(0.0, 0.004, edge) * uOpacity;
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`

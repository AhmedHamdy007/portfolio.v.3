export const photoVertex = /* glsl */ `
  uniform float uTime;
  uniform float uVelocity;
  uniform float uFocus;
  uniform float uPhase;
  uniform float uFold;
  varying vec2 vUv;
  varying float vScreenY;
  #include <morphtarget_pars_vertex>
  void main() {
    vUv = uv;
    #include <begin_vertex>
    #include <morphtarget_vertex>
    vec3 p = transformed;
    float energy = min(abs(uVelocity), 3.0);
    float bend = sin(uv.y * 3.14159) * sin(uv.x * 3.14159);
    p.z += sin(p.y * 2.5 + uPhase + uTime * 0.3) * bend * energy * 0.035 * (1.0 - uFocus) * (1.0 - uFold);
    p.x += sin(uv.y * 3.14159) * uVelocity * 0.009 * (1.0 - uFocus);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    vScreenY = gl_Position.y / gl_Position.w * 0.5 + 0.5;
  }
`

export const photoFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uVelocity;
  uniform float uOpacity;
  uniform float uFocus;
  uniform float uImageAspect;
  uniform float uPlaneAspect;
  uniform float uGallery;
  uniform float uDevelop;
  uniform float uFold;
  uniform float uPhase;
  varying vec2 vUv;
  varying float vScreenY;
  float grain(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float emulsion(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(grain(i), grain(i + vec2(1.0, 0.0)), f.x), mix(grain(i + vec2(0.0, 1.0)), grain(i + 1.0), f.x), f.y);
  }
  void main() {
    vec2 ratio = vec2(min(uPlaneAspect / uImageAspect, 1.0), min(uImageAspect / uPlaneAspect, 1.0));
    vec2 uv = ((vUv - 0.5) / 0.91) * ratio + 0.5;
    float strength = min(abs(uVelocity) * 0.0008, 0.004) * (1.0 - uFocus);
    vec2 shift = vec2(strength * 0.6, strength);
    vec3 color = vec3(texture2D(uMap, uv + shift).r, texture2D(uMap, uv).g, texture2D(uMap, uv - shift).b);
    // A reversible, seeded emulsion reveal; no temporal noise or flashing.
    float develop = mix(uDevelop, 1.0, uFocus);
    float density = emulsion(vUv * 6.0 + uPhase) * 0.65 + emulsion(vUv * 31.0) * 0.25 + vUv.y * 0.1;
    float exposed = smoothstep(density - 0.12, density + 0.12, develop * 1.25);
    float silver = grain(floor(vUv * 420.0) + uPhase);
    vec3 negative = vec3(0.11, 0.14, 0.13) + (1.0 - color) * 0.14 + silver * 0.06;
    color = mix(negative, color, exposed);
    float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float printMask = smoothstep(0.043, 0.046, edge);
    vec3 paper = vec3(0.83, 0.80, 0.73);
    // Preserve photographic color; only the archival paper is tinted.
    color = mix(paper, color, printMask);
    // Sprocket perforations belong to the ribbon, disappearing as each frame
    // becomes a full-size print. No extra meshes or transparent texture files.
    float sprocket = (1.0 - smoothstep(0.11, 0.18, abs(fract(vUv.x * 5.0) - 0.5)))
      * (1.0 - smoothstep(0.009, 0.015, abs(min(vUv.y, 1.0 - vUv.y) - 0.019)));
    // A Möbius strip has one side: photographs continue across the twist.
    // Slight reverse-face shading makes the fold legible without hiding them.
    if (!gl_FrontFacing) color *= 0.82;
    float margin = smoothstep(0.03, 0.15, vScreenY) * (1.0 - smoothstep(0.68, 0.82, vScreenY));
    float framing = mix(1.0, margin, uGallery * (1.0 - uFocus));
    gl_FragColor = vec4(color, smoothstep(0.0, 0.003, edge) * uOpacity * framing * (1.0 - sprocket * uFold * (1.0 - uFocus)));
    #include <colorspace_fragment>
  }
`

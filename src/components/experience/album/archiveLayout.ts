import * as THREE from 'three'

export const ALBUM_CHAPTERS = [
  { label: 'INSIDE A MOMENT', at: 0 },
  { label: 'THROUGH THE LENS', at: 0.22 },
  { label: 'THE PEOPLE IN IT', at: 0.68 },
  { label: 'REMEMBERED', at: 1 },
] as const

// Two continuous moves joined at the front optical element. A short zero-speed
// handoff lets the aperture open before we travel through the real opening.
const approach = new THREE.CubicBezierCurve3(
  new THREE.Vector3(0, 0.6, 14), new THREE.Vector3(3, 1.2, 10),
  new THREE.Vector3(0.4, 0, 6), new THREE.Vector3(0, 0, 5.8),
)
const passage = new THREE.CubicBezierCurve3(
  new THREE.Vector3(0, 0, 5.8), new THREE.Vector3(0, 0, -2),
  new THREE.Vector3(3.2, 1, -5), new THREE.Vector3(0, 0, -11.2),
)
export function journeyPose(progress: number, position: THREE.Vector3, look: THREE.Vector3) {
  if (progress <= 0.28) {
    const t = THREE.MathUtils.smootherstep(progress, 0, 0.28)
    approach.getPoint(t, position)
    look.set(0, 0, -4 * t)
  } else if (progress <= 0.86) {
    const t = THREE.MathUtils.smootherstep(progress, 0.28, 0.64)
    passage.getPoint(t, position)
    look.set(Math.sin(t * Math.PI) * 1.6, 0, -4 - 18 * t)
  } else if (progress <= 0.955) {
    // The room contracts first; then we withdraw along the optical axis.
    // Keep X/Y centred until safely outside the extended front element.
    const t = THREE.MathUtils.smootherstep(progress, 0.86, 0.955)
    position.set(0, 0, THREE.MathUtils.lerp(-11.2, 5.8, t))
    look.set(0, 0, THREE.MathUtils.lerp(-22, 0, t))
  } else {
    const t = THREE.MathUtils.smootherstep(progress, 0.955, 1)
    position.set(0, t * 2, THREE.MathUtils.lerp(5.8, 20, t))
    look.set(0, 0, 0)
  }
  return 42
}
export function journeyBank(progress: number) {
  if (progress >= 0.955) return 0
  if (progress > 0.86) return -Math.sin(THREE.MathUtils.smootherstep(progress, 0.86, 0.955) * Math.PI) * 0.22
  if (progress <= 0.28) return -Math.sin(THREE.MathUtils.smootherstep(progress, 0, 0.28) * Math.PI) * 0.14
  return Math.sin(THREE.MathUtils.smootherstep(progress, 0.28, 0.64) * Math.PI * 2) * 0.56
}
export const inArchive = (p: number) => p >= 0.64 && p <= 0.8
export const galleryProgress = (p: number) => THREE.MathUtils.clamp((p - 0.64) / 0.16, 0, 1)
export const unfoldProgress = (p: number) => THREE.MathUtils.smootherstep(p, 0.48, 0.64) * (1 - THREE.MathUtils.smootherstep(p, 0.8, 0.875))
export const returnProgress = (p: number) => THREE.MathUtils.smootherstep(p, 0.85, 0.925)

const ribbonTilt = new THREE.Euler(0.42, -0.92, -0.32)
const ribbonRotation = new THREE.Quaternion().setFromEuler(ribbonTilt)
// A true half-twist: P(0, v) = P(2π, -v). The surface has one continuous side.
export function ribbonPoint(u: number, v: number, mobile: boolean, out: THREE.Vector3) {
  const radial = 3.35 + v * Math.cos(u * 0.5)
  out.set(radial * Math.cos(u), radial * Math.sin(u), v * Math.sin(u * 0.5))
    .applyQuaternion(ribbonRotation)
  if (mobile) { out.multiplyScalar(0.52); out.y += 2.7 }
  else out.x += 2.7
  return out
}
export function foldedPrint(index: number, count: number, mobile: boolean, position: THREE.Vector3, rotation: THREE.Euler) {
  ribbonPoint((index + 0.5) / count * Math.PI * 2, 0, mobile, position)
  rotation.set(0, 0, 0)
}

// Native morph targets keep GPU deformation AND Three's CPU raycasting in
// agreement. Only one geometry allocation per photograph/responsive size.
export function createRibbonPrint(index: number, count: number, width: number, height: number, mobile: boolean) {
  const geometry = new THREE.PlaneGeometry(width, height, mobile ? 12 : 24, mobile ? 8 : 16)
  const uv = geometry.attributes.uv
  const positions = new Float32Array(uv.count * 3)
  const center = ribbonPoint((index + 0.5) / count * Math.PI * 2, 0, mobile, new THREE.Vector3())
  const point = new THREE.Vector3()
  for (let i = 0; i < uv.count; i++) {
    const u = (index + 0.008 + uv.getX(i) * 0.984) / count * Math.PI * 2
    ribbonPoint(u, (uv.getY(i) - 0.5) * 2.3, mobile, point).sub(center)
    point.toArray(positions, i * 3)
  }
  geometry.morphAttributes.position = [new THREE.BufferAttribute(positions, 3)]
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

import * as THREE from 'three'

export const ALBUM_CHAPTERS = [
  { label: 'DEPARTURE', at: 0 },
  { label: 'FREEFALL', at: 0.25 },
  { label: 'THE ARCHIVE', at: 0.48 },
  { label: 'AFTERGLOW', at: 0.96 },
] as const

// One portal-local flight. Position, gaze and bank are authored together.
const POSES = [
  { at: 0, position: [0, 8, 27], look: [0, 6, 12], fov: 52, roll: -0.06 },
  { at: 0.12, position: [9, 11, 21], look: [3, 4, 11], fov: 55, roll: -0.18 },
  { at: 0.19, position: [5, 8, 19], look: [0, 0.2, 10], fov: 56, roll: -0.06 },
  { at: 0.23, position: [1.5, 5, 17], look: [-1, 0.2, 10], fov: 58, roll: 0.03 },
  // Cross their left shoulder, then hold a true reverse angle behind the pair.
  { at: 0.28, position: [-7, 2.5, 10], look: [0, 0.2, 10], fov: 60, roll: 0.1 },
  { at: 0.325, position: [-3, 3, 3], look: [0, 0.2, 10], fov: 60, roll: 0.14 },
  // Turn through a sideward gaze, never through a zero-length look direction.
  { at: 0.36, position: [-4, 2, 3], look: [-11, -3, 3], fov: 61, roll: -0.24 },
  { at: 0.39, position: [-1, -3, 4], look: [0, -8, -4], fov: 60, roll: -0.12 },
  { at: 0.43, position: [0, -10, -3], look: [0, -10, -15], fov: 59, roll: 0 },
  { at: 0.73, position: [0, -10, -3.6], look: [0, -10, -15], fov: 57, roll: 0 },
  { at: 0.8, position: [-2, -13, -8], look: [-9, -3, -22], fov: 62, roll: -0.2 },
  { at: 0.89, position: [-16, -1, -19], look: [-10, -8, -28], fov: 57, roll: 0.12 },
  { at: 1, position: [-5, -6, -23], look: [-11, -8, -28], fov: 52, roll: 0 },
] as const

export function journeyPose(progress: number, position: THREE.Vector3, look: THREE.Vector3) {
  let index = 0
  while (index < POSES.length - 2 && progress > POSES[index + 1].at) index++
  const a = POSES[index]
  const b = POSES[index + 1]
  const t = THREE.MathUtils.smootherstep(progress, a.at, b.at)
  position.set(
    THREE.MathUtils.lerp(a.position[0], b.position[0], t),
    THREE.MathUtils.lerp(a.position[1], b.position[1], t),
    THREE.MathUtils.lerp(a.position[2], b.position[2], t),
  )
  look.set(
    THREE.MathUtils.lerp(a.look[0], b.look[0], t),
    THREE.MathUtils.lerp(a.look[1], b.look[1], t),
    THREE.MathUtils.lerp(a.look[2], b.look[2], t),
  )
  return THREE.MathUtils.lerp(a.fov, b.fov, t)
}

export function journeyBank(progress: number) {
  let index = 0
  while (index < POSES.length - 2 && progress > POSES[index + 1].at) index++
  const a = POSES[index], b = POSES[index + 1]
  return THREE.MathUtils.lerp(a.roll, b.roll, THREE.MathUtils.smootherstep(progress, a.at, b.at))
}

export const inArchive = (p: number) => p >= 0.47 && p <= 0.75
export const galleryProgress = (p: number) => THREE.MathUtils.clamp((p - 0.47) / 0.26, 0, 1)
// A clean handoff: the vortex is fully gone before any photos appear.
export const galleryVisibility = (p: number) => THREE.MathUtils.smoothstep(p, 0.425, 0.47) * (1 - THREE.MathUtils.smoothstep(p, 0.75, 0.82))

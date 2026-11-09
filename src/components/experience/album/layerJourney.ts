import * as THREE from 'three'
import { journeyBank, journeyPose } from './archiveLayout'

export const MEMORY_LAYER_START = 0.64
export const MEMORY_LAYER_END = 0.84

/** Insert one viewport into the old four-viewport story, without retiming it.
 * The shared scroll store stays in native/raw coordinates. */
export function albumStoryProgress(raw: number) {
  const p = THREE.MathUtils.clamp(raw, 0, 1)
  if (p <= MEMORY_LAYER_START) return p / 0.8
  if (p <= MEMORY_LAYER_END) return 0.8
  return 0.8 + (p - MEMORY_LAYER_END) / 0.8
}

/** Gallery links select the first occurrence of the held .8 story position. */
export function albumScrollProgress(story: number) {
  const p = THREE.MathUtils.clamp(story, 0, 1)
  return p <= 0.8 ? p * 0.8 : MEMORY_LAYER_END + (p - 0.8) * 0.8
}

export const inMemoryLayer = (raw: number) => raw > MEMORY_LAYER_START && raw < MEMORY_LAYER_END
export const memoryLayerProgress = (raw: number) => THREE.MathUtils.clamp((raw - MEMORY_LAYER_START) / 0.2, 0, 1)

const point = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
// Start and finish at precisely the approved gallery pose. Photographs never
// become walls or move to another coordinate system: this is an added camera
// excursion through an independent background below the existing collection.
const eyePath = new THREE.CatmullRomCurve3([
  point(0, 0, -11.2),
  point(3, 18, -8),
  point(-4, -4, -12),
  point(-4, -10, -17),
  point(0, 0, -11.2),
], false, 'centripetal')
const gazePath = new THREE.CatmullRomCurve3([
  point(0, 0, -22),
  point(0, -9, -18),
  point(7, -13.5, -25),
  point(0, 0, -22),
  point(0, 0, -22),
], false, 'centripetal')

export function layerCameraPose(raw: number, position: THREE.Vector3, look: THREE.Vector3) {
  const originalFov = journeyPose(albumStoryProgress(raw), position, look)
  if (!inMemoryLayer(raw)) return originalFov
  const t = THREE.MathUtils.smootherstep(memoryLayerProgress(raw), 0, 1)
  eyePath.getPoint(t, position)
  gazePath.getPoint(t, look)
  return originalFov + Math.sin(t * Math.PI) ** 2 * 12
}

export function layerCameraBank(raw: number) {
  if (!inMemoryLayer(raw)) return journeyBank(albumStoryProgress(raw))
  const t = THREE.MathUtils.smootherstep(memoryLayerProgress(raw), 0, 1)
  return -Math.sin(t * Math.PI * 2) * 0.46
}

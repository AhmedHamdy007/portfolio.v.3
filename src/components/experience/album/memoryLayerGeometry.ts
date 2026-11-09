import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** Camera and photographs stay inside these real, open apertures. */
export const MEMORY_LAYER_OPENING = Object.freeze({ width: 20, depth: 22 })
export const MEMORY_LAYER_POSES = Object.freeze([
  { y: -3.5, z: -17.5, yaw: 0.12 },
  { y: -8.5, z: -17.5, yaw: -0.11 },
  { y: -13.5, z: -17.5, yaw: 0.08 },
])

function roundedRectangle(width: number, height: number, radius: number, x = 0, y = 0) {
  const path = new THREE.Shape()
  const left = x - width / 2
  const right = x + width / 2
  const bottom = y - height / 2
  const top = y + height / 2
  path.moveTo(left + radius, bottom)
  path.lineTo(right - radius, bottom)
  path.quadraticCurveTo(right, bottom, right, bottom + radius)
  path.lineTo(right, top - radius)
  path.quadraticCurveTo(right, top, right - radius, top)
  path.lineTo(left + radius, top)
  path.quadraticCurveTo(left, top, left, top - radius)
  path.lineTo(left, bottom + radius)
  path.quadraticCurveTo(left, bottom, left + radius, bottom)
  return path
}

function extrude(shape: THREE.Shape, depth: number, bevel: number) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth, steps: 1, curveSegments: 3,
    bevelEnabled: bevel > 0, bevelThickness: bevel,
    bevelSize: bevel, bevelSegments: 2,
  })
  geometry.clearGroups()
  geometry.translate(0, 0, -depth / 2)
  return geometry
}

function createNegative() {
  const shape = roundedRectangle(34, 36, 0.56)
  // These are mesh cutouts, including the sprocket holes. No alpha texture,
  // shader discard, raycast mask, or overlaid black rectangle fakes the depth.
  shape.holes.push(roundedRectangle(20, 22, 0.3))
  for (const side of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      shape.holes.push(roundedRectangle(1.25, 2.05, 0.18, side * 14, -14.7 + i * 4.2))
    }
  }
  return extrude(shape, 0.15, 0.035)
}

function createInlay() {
  const shape = roundedRectangle(20.42, 22.42, 0.48)
  shape.holes.push(roundedRectangle(20.32, 22.32, 0.43))
  const geometry = extrude(shape, 0.012, 0.005)
  // One physical champagne hairline set just proud of the upper face. It is
  // lit metal, not emissive decoration, and never extends into the opening.
  geometry.translate(0, 0, 0.116)
  return geometry
}

function stack(source: THREE.BufferGeometry, mobile: boolean) {
  const poses = mobile ? [MEMORY_LAYER_POSES[0], MEMORY_LAYER_POSES[2]] : MEMORY_LAYER_POSES
  const pieces = poses.map(pose => source.clone()
    .rotateX(-Math.PI / 2)
    .rotateY(pose.yaw)
    .translate(0, pose.y, pose.z))
  const geometry = mergeGeometries(pieces, false)
  pieces.forEach(piece => piece.dispose())
  source.dispose()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

/** Two merged, immutable geometries for the entire stack: exactly two draws. */
export function createMemoryLayerGeometry(mobile: boolean) {
  return { body: stack(createNegative(), mobile), inlay: stack(createInlay(), mobile) }
}

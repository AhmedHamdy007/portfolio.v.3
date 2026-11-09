import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { MEMORY_LAYER_POSES } from './memoryLayerGeometry'

export type ClockworkMode = 'optical' | 'decks'
export type GearPlacement = { position: THREE.Vector3; orientation: THREE.Quaternion; radius: number; direction: number; phase: number }
const TAU = Math.PI * 2

function merge(parts: THREE.BufferGeometry[]) {
  const plain = parts.map(part => {
    const geometry = part.index ? part.toNonIndexed() : part.clone()
    geometry.clearGroups()
    part.dispose()
    return geometry
  })
  const result = mergeGeometries(plain, false)
  plain.forEach(part => part.dispose())
  result.computeBoundingBox()
  result.computeBoundingSphere()
  return result
}

function circle(radius: number) {
  const path = new THREE.Path()
  path.absarc(0, 0, radius, 0, TAU, true)
  return path
}

function extrude(shape: THREE.Shape, depth = 0.12, bevel = 0.018) {
  return new THREE.ExtrudeGeometry(shape, { depth, steps: 1, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments: 12 }).translate(0, 0, -depth / 2)
}

function annulus(outer: number, inner: number, depth = 0.12) {
  const shape = new THREE.Shape()
  shape.absarc(0, 0, outer, 0, TAU, false)
  shape.holes.push(circle(inner))
  return extrude(shape, depth)
}

/** Bevelled tooth profile, six open spokes and a bored hub; not a flat decal. */
export function createClockworkGear() {
  const shape = new THREE.Shape()
  for (let i = 0; i <= 24 * 4; i++) {
    const a = i / (24 * 4) * TAU
    const radius = i % 4 === 1 || i % 4 === 2 ? 1 : 0.89
    const x = Math.cos(a) * radius, y = Math.sin(a) * radius
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y)
  }
  shape.holes.push(circle(0.68))
  const parts: THREE.BufferGeometry[] = [extrude(shape), annulus(0.25, 0.095, 0.21)]
  for (let i = 0; i < 6; i++) parts.push(new THREE.BoxGeometry(0.53, 0.09, 0.095).translate(0.46, 0, 0).rotateZ(i / 6 * TAU))
  return merge(parts)
}

/** Three static material batches + one shared instanced gear geometry. */
export function createClockworkGeometry(mode: ClockworkMode, mobile: boolean) {
  const brass: THREE.BufferGeometry[] = [], steel: THREE.BufferGeometry[] = [], copper: THREE.BufferGeometry[] = []
  const gears: GearPlacement[] = []
  const axis = new THREE.Vector3(0, 0, 1)
  const horizontal = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)
  const identity = new THREE.Quaternion()
  const put = (parts: THREE.BufferGeometry[], geometry: THREE.BufferGeometry, position: THREE.Vector3, orientation = identity) => parts.push(geometry.applyQuaternion(orientation).translate(position.x, position.y, position.z))
  const gear = (position: THREE.Vector3, radius: number, orientation: THREE.Quaternion, direction: number, phase: number) => {
    gears.push({ position, radius, orientation, direction, phase })
    const normal = axis.clone().applyQuaternion(orientation)
    put(steel, annulus(radius * 0.37, radius * 0.13, 0.22), position.clone().addScaledVector(normal, -0.18), orientation)
    put(steel, new THREE.CylinderGeometry(radius * 0.085, radius * 0.085, 0.65, 8).rotateX(Math.PI / 2), position, orientation)
    put(brass, annulus(radius * 0.19, radius * 0.09, 0.09), position.clone().addScaledVector(normal, 0.21), orientation)
    // A dark slotted screw crosses the small polished axle cap.
    put(steel, new THREE.BoxGeometry(radius * 0.22, radius * 0.027, 0.02), position.clone().addScaledVector(normal, 0.27), orientation)
  }
  const pipe = (points: THREE.Vector3[], radius = 0.07) => copper.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), mobile ? 20 : 40, radius, 6, false))

  if (mode === 'optical') {
    const levels = mobile ? [-7, -29] : [-6, -15, -29]
    levels.forEach((z, level) => {
      const center = new THREE.Vector3(0, 0, z)
      put(steel, annulus(8.4, 6.05, 0.27), center)
      for (const r of [6.12, 6.35, 8.16]) put(brass, new THREE.TorusGeometry(r, 0.055, 6, mobile ? 64 : 112), center.clone().add(new THREE.Vector3(0, 0, 0.19)))
      // Segmented shutter leaves occupy only the collar, leaving the flight clear.
      for (let i = 0; i < 9; i++) {
        const blade = new THREE.Shape()
        blade.moveTo(6.44, 0)
        blade.quadraticCurveTo(7.15, 0.16, 7.75, 1.9)
        blade.lineTo(7.1, 2.5)
        blade.quadraticCurveTo(6.53, 1.2, 6.44, 0)
        put(brass, extrude(blade, 0.035, 0.008).rotateZ(i / 9 * TAU + level * 0.15), center.clone().add(new THREE.Vector3(0, 0, 0.23)))
      }
      const count = mobile ? 4 : 6
      for (let i = 0; i < count; i++) {
        const a = i / count * TAU + 0.28 + level * 0.37
        const pos = new THREE.Vector3(Math.cos(a) * 7.6, Math.sin(a) * 7.6, z + 0.56)
        gear(pos, 0.88, identity, i % 2 ? -1 : 1, a)
        // Adjacent smaller pinion, opposite direction and inverse-radius speed.
        if (!mobile) gear(new THREE.Vector3(Math.cos(a + 0.196) * 7.6, Math.sin(a + 0.196) * 7.6, z + 0.56), 0.64, identity, i % 2 ? 1 : -1, a + Math.PI / 24)
      }
      for (let i = 0; i < 48; i++) {
        const a = i / 48 * TAU
        put(brass, new THREE.BoxGeometry(i % 4 ? 0.1 : 0.23, 0.025, 0.025).translate(6.63, 0, 0).rotateZ(a), center.clone().add(new THREE.Vector3(0, 0, 0.36)))
      }
    })
    for (let i = 0; i < (mobile ? 3 : 5); i++) {
      const a = i / 5 * TAU + 0.5
      pipe([0, 0.3, 0.65, 1].map(t => new THREE.Vector3(Math.cos(a + t * 0.35) * 8.65, Math.sin(a + t * 0.35) * 8.65, -5 - 25 * t)), 0.09)
    }
  } else {
    const levels = mobile ? [MEMORY_LAYER_POSES[0], MEMORY_LAYER_POSES[2]] : MEMORY_LAYER_POSES
    levels.forEach((level, row) => {
      const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), level.yaw)
      const orient = yaw.clone().multiply(horizontal)
      const at = (x: number, z: number, h = 0.38) => new THREE.Vector3(x, h, z).applyQuaternion(yaw).add(new THREE.Vector3(0, level.y, level.z))
      for (const side of [-1, 1]) {
        for (let i = 0; i < (mobile ? 1 : 3); i++) {
          const z = -7 + i * 7
          gear(at(side * 12.3, z), 1.55, orient, side, row + i * 0.7)
          gear(at(side * 12.3, z + 2.35), 0.86, orient, -side, row + Math.PI / 24)
          put(steel, new THREE.BoxGeometry(0.7, 0.22, 3.15), at(side * 12.3, z + 0.9, 0.08), yaw)
        }
        // Routed around the edge, never across the central camera aperture.
        pipe([-12.5, -6, 4, 12.5].map((z, i) => at(side * (15.7 + Math.sin(i) * 0.2), z, 0.4)), 0.095)
        for (let i = 0; i < 10; i++) {
          put(brass, new THREE.CylinderGeometry(0.13, 0.13, 0.12, 6), at(side * 10.75, -9.5 + i * 2.1, 0.17), yaw)
        }
      }
      // Portrait framing hides the far side rails. Move its main winding pair
      // onto the rear bridge, visible above the aperture without narrowing it.
      if (mobile) {
        gear(at(-1.3, -13.2), 1.3, orient, 1, row)
        gear(at(1.3, -13.2), 1.3, orient, -1, row + Math.PI / 24)
      }
      // Fine concentric winding-spring detail on the rear edge of each deck.
      const springCenter = at(3.6, 13.5, 0.4)
      for (let i = 0; i < 4; i++) put(copper, new THREE.TorusGeometry(0.75 + i * 0.18, 0.035, 5, 48), springCenter, orient)
      put(steel, annulus(1.6, 1.45, 0.08), springCenter, orient)
    })
    for (const x of [-12, 12]) for (const z of [-30, -5]) {
      put(steel, new THREE.CylinderGeometry(0.11, 0.11, 10, 10), new THREE.Vector3(x, -8.5, z))
      put(copper, new THREE.CylinderGeometry(0.27, 0.27, 3, 12), new THREE.Vector3(x, -8.5, z))
      for (const y of [-10, -7]) put(brass, new THREE.CylinderGeometry(0.34, 0.34, 0.12, 12), new THREE.Vector3(x, y, z))
    }
  }
  return { brass: merge(brass), steel: merge(steel), copper: merge(copper), gear: createClockworkGear(), gears }
}

import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const TAU = Math.PI * 2
const NO_RAYCAST = () => {}

function batch(parts: THREE.BufferGeometry[]) {
  const plain = parts.map(part => {
    const geometry = part.index ? part.toNonIndexed() : part.clone()
    geometry.clearGroups()
    part.dispose()
    return geometry
  })
  const geometry = mergeGeometries(plain, false)
  plain.forEach(part => part.dispose())
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function hole(x: number, y: number, radius: number) {
  const path = new THREE.Path()
  path.absarc(x, y, radius, 0, TAU, true)
  return path
}

function extrude(shape: THREE.Shape, depth: number, bevel = 0.006) {
  return new THREE.ExtrudeGeometry(shape, {
    depth, steps: 1, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel,
    bevelSegments: 1, curveSegments: 10,
  }).translate(0, 0, -depth / 2)
}

function ring(outer: number, inner: number, depth: number) {
  // Lathed normals keep specular highlights continuous at macro distances.
  // Extruded circles visibly facet when the visitor passes through the lens.
  const h = depth / 2, b = Math.min(0.006, depth / 4, (outer - inner) / 4)
  const profile = [
    [inner + b, -h], [outer - b, -h], [outer, -h + b], [outer, h - b],
    [outer - b, h], [inner + b, h], [inner, h - b], [inner, -h + b], [inner + b, -h],
  ].map(([x, y]) => new THREE.Vector2(x, y))
  return new THREE.LatheGeometry(profile, outer > 1 ? 96 : 24).rotateX(Math.PI / 2)
}

function plate(width: number, height: number, depth: number, radius = 0.08) {
  const x = -width / 2, y = -height / 2
  const s = new THREE.Shape()
  s.moveTo(x + radius, y)
  s.lineTo(x + width - radius, y); s.quadraticCurveTo(x + width, y, x + width, y + radius)
  s.lineTo(x + width, y + height - radius); s.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  s.lineTo(x + radius, y + height); s.quadraticCurveTo(x, y + height, x, y + height - radius)
  s.lineTo(x, y + radius); s.quadraticCurveTo(x, y, x + radius, y)
  return extrude(s, depth)
}

/** Matching module/pitch, bored shafts and relieved webs; no solid toy cogs. */
function gear(teeth: number) {
  const pitch = teeth * 0.01
  const shape = new THREE.Shape()
  for (let i = 0; i <= teeth * 8; i++) {
    const phase = i % 8
    const radius = pitch + (phase === 2 || phase === 3 || phase === 4 ? 0.013 : phase === 1 || phase === 5 ? 0 : -0.018)
    const a = i / (teeth * 8) * TAU
    if (!i) shape.moveTo(Math.cos(a) * radius, Math.sin(a) * radius)
    else shape.lineTo(Math.cos(a) * radius, Math.sin(a) * radius)
  }
  shape.holes.push(hole(0, 0, 0.025))
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * TAU
    shape.holes.push(hole(Math.cos(a) * pitch * 0.57, Math.sin(a) * pitch * 0.57, pitch * 0.19))
  }
  return extrude(shape, 0.035, 0.002)
}

/** Original, local product-detail assembly. Eight batches, no downloaded assets. */
export function createCameraMechanics() {
  const root = new THREE.Group()
  root.name = 'AH precision winding assembly'
  const materials = {
    steel: new THREE.MeshStandardMaterial({ color: '#b8c3bc', metalness: 0.88, roughness: 0.28 }),
    brass: new THREE.MeshStandardMaterial({ color: '#b59760', metalness: 0.82, roughness: 0.34 }),
    graphite: new THREE.MeshStandardMaterial({ color: '#17201e', metalness: 0.45, roughness: 0.46 }),
    jewel: new THREE.MeshStandardMaterial({ color: '#5a1922', metalness: 0.32, roughness: 0.23 }),
  }
  const geometries: THREE.BufferGeometry[] = []
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = root) => {
    geometry.clearGroups()
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    geometries.push(geometry)
    const object = new THREE.Mesh(geometry, material)
    object.raycast = NO_RAYCAST
    parent.add(object)
    return object
  }
  const steel: THREE.BufferGeometry[] = [], brass: THREE.BufferGeometry[] = [], black: THREE.BufferGeometry[] = [], jewels: THREE.BufferGeometry[] = []
  const put = (parts: THREE.BufferGeometry[], g: THREE.BufferGeometry, x: number, y: number, z: number) => parts.push(g.translate(x, y, z))

  // A raised service recess masks the old grip ribs locally. Its dark floor,
  // machined rim and proud bearings establish real depth without another pass.
  put(black, plate(0.91, 1.37, 0.075), 2.2, -0.19, 0.415)
  put(brass, plate(0.95, 1.41, 0.038), 2.2, -0.19, 0.373)
  for (const y of [-0.77, 0.39]) for (const x of [1.85, 2.55]) {
    put(steel, ring(0.037, 0.009, 0.022), x, y, 0.47)
    put(black, new THREE.BoxGeometry(0.041, 0.007, 0.008).rotateZ(x + y), x, y, 0.485)
  }
  for (const y of [0.07, -0.43]) {
    put(steel, ring(0.087, 0.025, 0.068), 2.2, y, 0.482)
    put(brass, ring(0.055, 0.022, 0.024), 2.2, y, 0.581)
    put(jewels, new THREE.CylinderGeometry(0.019, 0.019, 0.016, 12).rotateX(Math.PI / 2), 2.2, y, 0.598)
  }
  // Stepped bearing bridge: narrow enough to keep the moving gear webs visible.
  put(steel, plate(0.105, 0.64, 0.027, 0.035).rotateZ(-0.2), 2.39, -0.17, 0.566)
  for (const y of [0.14, -0.48]) put(brass, ring(0.026, 0.009, 0.018), 2.39 + (y + 0.17) * 0.2, y, 0.594)

  // Hot-shoe rails, sync socket and a folded rewind crank add useful silhouettes.
  for (const x of [-0.29, 0.29]) put(steel, new THREE.BoxGeometry(0.065, 0.045, 0.51), x, 1.755, -0.45)
  for (let i = 0; i < 3; i++) put(brass, new THREE.CylinderGeometry(0.025, 0.025, 0.025, 12), -0.12 + i * 0.12, 1.744, -0.3)
  put(steel, ring(0.13, 0.063, 0.09), -2.26, -0.67, 0.4)
  put(black, ring(0.062, 0.029, 0.027), -2.26, -0.67, 0.463)
  put(brass, plate(0.59, 0.115, 0.042, 0.045).rotateX(-Math.PI / 2).rotateY(-0.3), -2.04, 1.811, -0.4)
  put(steel, new THREE.CylinderGeometry(0.065, 0.065, 0.065, 16), -2.3, 1.833, -0.48)

  // A three-lug bayonet flange with screw seats, kept outside the optical axis.
  put(steel, ring(1.755, 1.705, 0.038), 0, 0, 0.3)
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * TAU + Math.PI / 6
    const lug = new THREE.Shape()
    lug.absarc(0, 0, 1.76, a - 0.15, a + 0.15, false)
    lug.absarc(0, 0, 1.64, a + 0.15, a - 0.15, true)
    lug.closePath()
    put(brass, extrude(lug, 0.048), 0, 0, 0.342)
    put(steel, ring(0.043, 0.013, 0.027), Math.cos(a) * 1.7, Math.sin(a) * 1.7, 0.38)
  }
  mesh(batch(steel), materials.steel).name = 'Machined fittings'
  mesh(batch(brass), materials.brass).name = 'Champagne mounting hardware'
  mesh(batch(black), materials.graphite).name = 'Recesses and screw slots'
  mesh(batch(jewels), materials.jewel).name = 'Bearing jewels'

  const drive = mesh(gear(32), materials.brass)
  drive.name = '32 tooth winding wheel'; drive.position.set(2.2, 0.07, 0.535)
  const pinion = mesh(gear(18), materials.steel)
  pinion.name = '18 tooth transfer pinion'; pinion.position.set(2.2, -0.43, 0.535)

  const advance = new THREE.Group(); advance.position.set(1.99, 1.745, -0.23); root.add(advance)
  const lever = new THREE.Shape()
  lever.moveTo(-0.03, -0.12); lever.bezierCurveTo(0.26, -0.16, 0.6, -0.43, 0.91, -0.35)
  lever.quadraticCurveTo(1.02, -0.3, 0.92, -0.18)
  lever.bezierCurveTo(0.54, -0.17, 0.28, 0.16, -0.03, 0.12)
  lever.closePath()
  const arm = batch([extrude(lever, 0.052), ring(0.24, 0.18, 0.05)])
  arm.rotateX(-Math.PI / 2)
  mesh(arm, materials.steel, advance).name = 'Film advance lever'

  // Nested optical baffles travel with the existing focus barrel, not the body.
  const barrelRoot = new THREE.Group()
  barrelRoot.name = 'Machined helicoid'
  const sleeve: THREE.BufferGeometry[] = []
  for (let i = 0; i < 5; i++) put(sleeve, ring(1.225, 1.19, 0.025), 0, 0, 0.47 + i * 0.135)
  const helix = Array.from({ length: 145 }, (_, i) => {
    const a = i / 144 * TAU * 3
    return new THREE.Vector3(Math.cos(a) * 1.238, Math.sin(a) * 1.238, 0.49 + i / 144 * 0.57)
  })
  sleeve.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 144, 0.011, 4, false))
  mesh(batch(sleeve), materials.brass, barrelRoot).name = 'Helicoid thread and light baffles'

  return {
    root, barrelRoot, drive, pinion, advance, materials,
    dispose() { geometries.forEach(g => g.dispose()); Object.values(materials).forEach(m => m.dispose()) },
  }
}

export function updateCameraMechanics(parts: ReturnType<typeof createCameraMechanics>, open: number) {
  // Exact tooth ratio and fixed phase; reversing scroll reverses the same train.
  const turn = open * Math.PI * 1.4
  parts.drive.rotation.z = turn
  parts.pinion.rotation.z = -turn * 32 / 18 + Math.PI / 18
  parts.advance.rotation.y = -open * 0.72
}

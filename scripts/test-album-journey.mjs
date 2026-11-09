import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import ts from 'typescript'
import * as THREE from 'three'

// Exercise actual modules without a browser or a second renderer.
function moduleUrl(path, imports = {}) {
  const source = readFileSync(path, 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
    .replace(/from ['"]([^'"]+)['"]/g, (_, specifier) => 'from ' + JSON.stringify(imports[specifier] ?? import.meta.resolve(specifier)))
  return 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
}
const archiveUrl = moduleUrl('src/components/experience/album/archiveLayout.ts')
const { journeyPose, journeyBank, unfoldProgress, foldedPrint, galleryProgress, inArchive, ALBUM_CHAPTERS, ribbonPoint, createRibbonPrint, returnProgress } = await import(archiveUrl)
const { albumStoryProgress, albumScrollProgress, inMemoryLayer, memoryLayerProgress, layerCameraPose, layerCameraBank, MEMORY_LAYER_START, MEMORY_LAYER_END } = await import(moduleUrl('src/components/experience/album/layerJourney.ts', { './archiveLayout': archiveUrl }))
const { createMemoryLayerGeometry, MEMORY_LAYER_POSES, MEMORY_LAYER_OPENING } = await import(moduleUrl('src/components/experience/album/memoryLayerGeometry.ts'))
const { DRIFT_MOMENTS } = await import(moduleUrl('src/constants/album.ts'))
const position = new THREE.Vector3(), look = new THREE.Vector3(), previous = new THREE.Vector3()
const originalPosition = new THREE.Vector3(), originalLook = new THREE.Vector3(), local = new THREE.Vector3()
const orientation = new THREE.Quaternion(), previousOrientation = new THREE.Quaternion(), bank = new THREE.Quaternion()
const view = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0), axis = new THREE.Vector3(0, 0, 1)
let crossingSamples = 0

for (const mobile of [false, true]) for (let i = 0; i <= 10000; i++) {
  const raw = i / 10000
  const story = albumStoryProgress(raw)
  const fov = layerCameraPose(raw, position, look) + (mobile ? 7 : 0)
  const roll = layerCameraBank(raw) * (mobile ? 0.35 : 1)
  if (mobile) { position.x *= 0.28; look.x *= 0.28 }
  assert([...position, ...look, fov, roll, story].every(Number.isFinite))
  assert(position.distanceTo(look) > 1, 'The camera never crosses its look target')
  assert(story >= 0 && story <= 1 + 1e-12)
  assert(fov >= 40 && fov <= (mobile ? 67 : 60))
  assert(Math.abs(roll) <= 0.57, 'Approved and additional bank stay below 33 degrees')
  orientation.setFromRotationMatrix(view.lookAt(position, look, up)).multiply(bank.setFromAxisAngle(axis, roll))
  if (i > 0) {
    assert(orientation.angleTo(previousOrientation) < 0.04, 'No perspective flip at raw ' + raw)
    // The longer added arc has its own explicit bound; retain the original
    // bound outside it instead of weakening the approved journey's checks.
    assert(position.distanceTo(previous) < (inMemoryLayer(raw) ? 0.13 : 0.08), 'Continuous camera position at raw ' + raw)
  }
  if (!inMemoryLayer(raw)) {
    const originalFov = journeyPose(story, originalPosition, originalLook) + (mobile ? 7 : 0)
    if (mobile) { originalPosition.x *= 0.28; originalLook.x *= 0.28 }
    assert(position.distanceTo(originalPosition) < 1e-12, 'Exact approved camera position outside the added layer')
    assert(look.distanceTo(originalLook) < 1e-12, 'Exact approved camera aim outside the added layer')
    assert.equal(fov, originalFov)
    assert.equal(roll, journeyBank(story) * (mobile ? 0.35 : 1))
    if (story > 0.28 && position.z < 1.4 && position.z > -1.3) {
      assert(Math.hypot(position.x, position.y) < 1.25, 'The optical crossing remains inside the physical lens opening')
    }
  } else {
    assert.equal(story, 0.8, 'The added viewpoint never advances or rebuilds the approved photographs')
    assert.equal(unfoldProgress(story), 1)
    assert.equal(returnProgress(story), 0)
    const visiblePoses = mobile ? [MEMORY_LAYER_POSES[0], MEMORY_LAYER_POSES[2]] : MEMORY_LAYER_POSES
    for (const pose of visiblePoses) {
      if (Math.abs(position.y - pose.y) < 0.25) {
        local.copy(position).sub(new THREE.Vector3(0, pose.y, pose.z)).applyAxisAngle(up, -pose.yaw)
        assert(Math.abs(local.x) < MEMORY_LAYER_OPENING.width / 2 - 0.35, 'Camera clears the actual aperture width and bevel')
        assert(Math.abs(local.z) < MEMORY_LAYER_OPENING.depth / 2 - 0.35, 'Camera clears the actual aperture depth and bevel')
        crossingSamples++
      }
    }
  }
  previous.copy(position)
  previousOrientation.copy(orientation)
}
assert(crossingSamples > 0, 'The path must cross a physical layer rather than only look at it')

assert.equal(MEMORY_LAYER_START, 0.64)
assert.equal(MEMORY_LAYER_END, 0.84)
assert.equal(inMemoryLayer(0.64), false)
assert.equal(inMemoryLayer(0.84), false)
assert.equal(memoryLayerProgress(0.64), 0)
assert(Math.abs(memoryLayerProgress(0.84) - 1) < 1e-12, 'Normalised layer endpoint is one within floating-point precision')
let priorMappedStory = 0
for (let i = 0; i <= 10000; i++) {
  const story = i / 10000
  const raw = albumScrollProgress(story)
  assert(Math.abs(albumStoryProgress(raw) - story) < 1e-12, 'Legacy links round-trip through raw coordinates')
  const rawAgain = albumScrollProgress(albumStoryProgress(story))
  if (story <= 0.64 || story > 0.84) assert(Math.abs(rawAgain - story) < 1e-12)
  else assert(Math.abs(rawAgain - 0.64) < 1e-12, 'Held .8 resolves to its first occurrence')
  const mappedStory = albumStoryProgress(story)
  assert(mappedStory >= priorMappedStory, 'The inserted hold never reverses legacy story progress')
  priorMappedStory = mappedStory
  // Confirmed installed-Drei DOM: pages=5 yields maxScroll/clientHeight=5,
  // since the fixed child precedes the fill. Preserve old physical pacing.
  assert(Math.abs(raw * 5 - story * 4 - (story > 0.8 ? 1 : 0)) < 1e-12)
}
assert(Math.abs(albumScrollProgress(0.68) - 0.544) < 1e-12)
for (const boundary of [0.64, 0.84]) {
  layerCameraPose(boundary, originalPosition, originalLook)
  const boundaryBank = layerCameraBank(boundary)
  for (const side of [-1, 1]) {
    layerCameraPose(boundary + side * 1e-5, position, look)
    assert(position.distanceTo(originalPosition) < 1e-5, 'Zero-speed layer entry and exit')
    assert(look.distanceTo(originalLook) < 1e-5, 'Gaze rejoins the approved gallery exactly')
    assert(Math.abs(layerCameraBank(boundary + side * 1e-5) - boundaryBank) < 1e-5)
  }
}

assert.equal(unfoldProgress(0), 0)
assert.equal(unfoldProgress(1), 0)
assert.equal(unfoldProgress(0.64), 1)
assert.equal(galleryProgress(0.64), 0)
assert(Math.abs(galleryProgress(0.8) - 1) < 1e-12)
assert.equal(inArchive(0.85), false)
assert.equal(returnProgress(0.85), 0)
assert.equal(returnProgress(0.925), 1)
assert(inArchive(ALBUM_CHAPTERS[2].at))
layerCameraPose(1, position, look)
assert(position.distanceTo(new THREE.Vector3(0, 2, 20)) < 1e-12, 'Original closing composition remains')
assert(look.length() < 1e-12)
assert.equal(layerCameraBank(1), 0)

// Native morphs retain CPU/GPU agreement and the approved responsive ribbon.
const rotation = new THREE.Euler(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
const center = new THREE.Vector3(), normal = new THREE.Vector3(), rayOrigin = new THREE.Vector3()
const ray = new THREE.Raycaster()
for (const mobile of [false, true]) for (let index = 0; index < DRIFT_MOMENTS.length; index++) {
  foldedPrint(index, DRIFT_MOMENTS.length, mobile, position, rotation)
  assert([...position, rotation.x, rotation.y, rotation.z].every(Number.isFinite))
  assert(Math.abs(position.z) < 3)
  previous.copy(position)
  foldedPrint(index, DRIFT_MOMENTS.length, mobile, position, rotation)
  assert(position.equals(previous), 'Responsive ribbon is deterministic')
  const aspect = DRIFT_MOMENTS[index].aspect
  const boxWidth = mobile ? 1.7 : 2.15
  const height = aspect >= 1 ? boxWidth / aspect : mobile ? 1.9 : 2.3
  const width = aspect >= 1 ? boxWidth : height * aspect
  const geometry = createRibbonPrint(index, DRIFT_MOMENTS.length, width, height, mobile)
  assert(Array.from(geometry.morphAttributes.position[0].array).every(Number.isFinite))
  assert(geometry.boundingSphere.radius > 0 && geometry.boundingSphere.radius < 5)
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
  mesh.updateMatrixWorld(true)
  assert.equal(mesh.morphTargetInfluences.length, 1)
  const triangle = Math.floor(geometry.index.count / 6) * 3
  for (const amount of [0, 0.25, 0.5, 0.75, 1]) {
    mesh.morphTargetInfluences[0] = amount
    mesh.getVertexPosition(geometry.index.getX(triangle), a)
    mesh.getVertexPosition(geometry.index.getX(triangle + 1), b)
    mesh.getVertexPosition(geometry.index.getX(triangle + 2), c)
    assert([...a, ...b, ...c].every(Number.isFinite))
    center.copy(a).add(b).add(c).multiplyScalar(1 / 3)
    normal.subVectors(b, a).cross(c.clone().sub(a)).normalize()
    assert(normal.lengthSq() > 0.99, 'Picking triangle remains nondegenerate through the native morph')
    rayOrigin.copy(center).addScaledVector(normal, 0.05)
    ray.set(rayOrigin, normal.negate())
    ray.near = 0; ray.far = 0.1
    assert(ray.intersectObject(mesh).length > 0, 'CPU raycasting follows the same morphed photograph as the shader')
  }
  mesh.material.dispose(); geometry.dispose()
}
for (const mobile of [false, true]) for (const v of [-1.15, 0, 1.15]) {
  ribbonPoint(0, v, mobile, position)
  ribbonPoint(Math.PI * 2, -v, mobile, previous)
  assert(position.distanceTo(previous) < 1e-10, 'The approved half-twist closes continuously')
}

for (const mobile of [false, true]) {
  const resources = createMemoryLayerGeometry(mobile)
  assert.deepEqual(Object.keys(resources).sort(), ['body', 'inlay'])
  for (const geometry of Object.values(resources)) {
    assert(Array.from(geometry.attributes.position.array).every(Number.isFinite))
    assert(geometry.boundingSphere.radius > 0 && geometry.boundingSphere.radius < 40)
    assert.equal(geometry.groups.length, 0, 'Two merged geometries without extra material-group draws')
  }
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(resources.body, material)
  mesh.updateMatrixWorld(true)
  const poses = mobile ? [MEMORY_LAYER_POSES[0], MEMORY_LAYER_POSES[2]] : MEMORY_LAYER_POSES
  for (const pose of poses) {
    ray.set(new THREE.Vector3(0, pose.y + 0.5, pose.z), new THREE.Vector3(0, -1, 0))
    ray.near = 0; ray.far = 1
    assert.equal(ray.intersectObject(mesh).length, 0, 'The opening is a physical hole, not a painted mask')
    position.set(12, 0, 0).applyAxisAngle(up, pose.yaw).add(new THREE.Vector3(0, pose.y + 0.5, pose.z))
    ray.set(position, new THREE.Vector3(0, -1, 0))
    assert(ray.intersectObject(mesh).length > 0, 'Solid foil remains outside the opening')
  }
  material.dispose()
  resources.body.dispose(); resources.inlay.dispose()
}

for (const file of ['space_boi.glb', 'space_ame_camping_-_amelia_watson_hololive.glb', '24_dizzying_space_travel_-_inktober2019.glb', 'tilt_brush_-_falling.glb', 'album/asteroids.glb', 'album/crystal.glb', 'album/memory-camera.glb']) {
  const path = resolve('public/models', file)
  const bytes = readFileSync(path)
  assert.equal(bytes.readUInt32LE(0), 0x46546c67)
  assert.equal(bytes.readUInt32LE(8), bytes.length)
  const model = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)))
  assert(model.meshes.length > 0)
  if (file === 'album/memory-camera.glb') {
    assert(bytes.length < 500_000, 'Camera remains within its 500 KB budget')
    assert(model.extensionsRequired.includes('KHR_draco_mesh_compression'))
    for (const name of ['CameraBody', 'FocusBarrel', 'FrontRing', 'LensGlass', ...Array.from({ length: 9 }, (_, i) => 'IrisBlade_' + String(i).padStart(2, '0'))]) {
      assert(model.nodes.some(node => node.name === name), 'Missing animated camera part: ' + name)
    }
    if (model.nodes.some(node => node.name === 'BackDoor')) {
      const runtime = readFileSync('src/components/experience/album/MemoryCamera.tsx', 'utf8')
      assert(runtime.includes("object.getObjectByName('BackDoor')") && runtime.includes('optionalBack.visible = false'), 'An optional later-model cover must not block the approved open chassis')
    }
    assert.equal((model.images ?? []).length, 0, 'No extra camera texture requests')
  }
  for (const image of model.images ?? []) if (image.uri) assert(existsSync(resolve(dirname(path), image.uri)), 'Missing texture: ' + image.uri)
}
const { createGatewayGeometry } = await import(moduleUrl('src/components/experience/gatewayGeometry.ts'))
for (const width of [0.79, 1.63, 2.65]) {
  for (const { geometry } of createGatewayGeometry(width, 3.65)) {
    assert(Array.from(geometry.attributes.position.array).every(Number.isFinite))
    geometry.computeBoundingSphere()
    assert(geometry.boundingSphere.radius > 0)
    geometry.dispose()
  }
}
console.log('Checks passed: 10,001 camera samples per device size, unchanged legacy poses/pacing, monotone story mapping, native ribbon morphs and picking, physical layer apertures, gateway geometry and retained source assets.')

import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import ts from 'typescript'
import * as THREE from 'three'

// Exercise the actual camera config without a browser or a second renderer.
const source = readFileSync('src/components/experience/album/albumJourney.ts', 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const code = compiled.replace(/from 'three'/g, `from '${import.meta.resolve('three')}'`)
const { journeyPose, journeyBank, galleryVisibility, galleryProgress, inArchive, ALBUM_CHAPTERS } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const position = new THREE.Vector3(), look = new THREE.Vector3(), previous = new THREE.Vector3()
const orientation = new THREE.Quaternion(), previousOrientation = new THREE.Quaternion()
const view = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0)
for (let i = 0; i <= 10000; i++) {
  const p = i / 10000
  const fov = journeyPose(p, position, look)
  assert([...position, ...look, fov, journeyBank(p)].every(Number.isFinite))
  assert(position.distanceTo(look) > 1, 'Camera must not cross its look target')
  orientation.setFromRotationMatrix(view.lookAt(position, look, up))
  if (i > 0) assert(orientation.angleTo(previousOrientation) < 0.04, 'No abrupt perspective flips')
  previousOrientation.copy(orientation)
  assert(fov >= 45 && fov <= 70)
  assert(Math.abs(journeyBank(p)) <= 0.29, 'Keep the cinematic bank below 17 degrees')
  if (i > 0) assert(position.distanceTo(previous) < 0.08, 'Camera path must stay continuous')
  assert(galleryVisibility(p) >= 0 && galleryVisibility(p) <= 1)
  previous.copy(position)
}
assert.equal(galleryVisibility(0), 0)
assert.equal(galleryVisibility(1), 0)
assert.equal(galleryVisibility(0.5), 1)
assert.equal(galleryVisibility(0.41), 0, 'No photo planes while the vortex is visible')
assert.equal(galleryProgress(0.47), 0)
assert.equal(galleryProgress(0.74), 1)
assert(inArchive(ALBUM_CHAPTERS[2].at))
journeyPose(0.325, position, look)
assert(position.z < 10 && look.z > position.z, 'Reverse angle must look at the couple from behind')
journeyPose(0.39, position, look)
assert(look.z < position.z && look.y < position.y, 'After the reverse angle, turn down into the vortex')
for (const file of ['space_boi.glb', 'space_ame_camping_-_amelia_watson_hololive.glb', '24_dizzying_space_travel_-_inktober2019.glb', 'tilt_brush_-_falling.glb', 'album/asteroids.glb', 'album/crystal.glb']) {
  const path = resolve('public/models', file)
  const bytes = readFileSync(path)
  assert.equal(bytes.readUInt32LE(0), 0x46546c67)
  assert.equal(bytes.readUInt32LE(8), bytes.length)
  const model = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)))
  assert(model.meshes.length > 0)
  for (const image of model.images ?? []) if (image.uri) assert(existsSync(resolve(dirname(path), image.uri)), `Missing texture: ${image.uri}`)
}
const gatewaySource = readFileSync('src/components/experience/gatewayGeometry.ts', 'utf8')
const gatewayCode = ts.transpileModule(gatewaySource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  .replace(/from 'three'/g, `from '${import.meta.resolve('three')}'`)
const { createGatewayGeometry } = await import(`data:text/javascript;base64,${Buffer.from(gatewayCode).toString('base64')}`)
for (const width of [0.79, 1.63, 2.65]) {
  for (const { geometry } of createGatewayGeometry(width, 3.65)) {
    assert(Array.from(geometry.attributes.position.array).every(Number.isFinite), 'Finite gateway vertices at every responsive size')
    geometry.computeBoundingSphere()
    assert(geometry.boundingSphere.radius > 0)
    geometry.dispose()
  }
}
console.log('Checks passed: 10,001 camera samples, rear-view turn, responsive gateway geometry, 6 GLBs and external texture paths.')

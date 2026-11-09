import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import * as THREE from 'three'

function moduleUrl(path, imports = {}) {
  const code = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
    .replace(/from ['"]([^'"]+)['"]/g, (_, name) => 'from ' + JSON.stringify(imports[name] ?? import.meta.resolve(name)))
  return 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
}
const base = 'src/components/experience/album/'
const layerUrl = moduleUrl(base + 'memoryLayerGeometry.ts')
const { createClockworkGeometry } = await import(moduleUrl(base + 'clockworkGeometry.ts', { './memoryLayerGeometry': layerUrl }))
const { layerCameraPose, albumStoryProgress } = await import(moduleUrl(base + 'layerJourney.ts', { './archiveLayout': moduleUrl(base + 'archiveLayout.ts') }))
const eye = new THREE.Vector3(), look = new THREE.Vector3()
const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
const ray = new THREE.Raycaster()
const directions = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)]
for (const mobile of [false, true]) for (const mode of ['optical', 'decks']) {
  const result = createClockworkGeometry(mode, mobile)
  let triangles = 0
  const meshes = ['brass', 'steel', 'copper'].map(name => {
    const geometry = result[name]
    assert(Array.from(geometry.attributes.position.array).every(Number.isFinite))
    assert.equal(geometry.groups.length, 0)
    triangles += geometry.attributes.position.count / 3
    const mesh = new THREE.Mesh(geometry, material)
    mesh.updateMatrixWorld(true)
    return mesh
  })
  triangles += result.gear.attributes.position.count / 3 * result.gears.length
  assert(triangles < (mobile ? 50000 : 110000), 'Bounded mechanism triangle budget')
  for (let i = 0; i <= 1000; i++) {
    const raw = i / 1000
    const story = albumStoryProgress(raw)
    if (mode === 'decks' ? raw < 0.64 || raw > 0.86 : story < 0.27 || story > 0.68) continue
    layerCameraPose(raw, eye, look)
    if (mobile) eye.x *= 0.28
    for (const direction of directions) {
      ray.set(eye, direction); ray.near = 0; ray.far = 0.3
      assert.equal(ray.intersectObjects(meshes, false).length, 0, `Static mechanism clears camera at ${raw}`)
    }
    for (const gear of result.gears) {
      assert(eye.distanceTo(gear.position) > gear.radius * 1.1 + 0.3, 'Camera clears rotating gear envelope')
    }
  }
  for (const key of ['brass', 'steel', 'copper', 'gear']) result[key].dispose()
  console.log(`${mode} ${mobile ? 'mobile' : 'desktop'}: ${result.gears.length} gears, ${triangles} triangles, 4 draws; finite geometry and camera clearance passed.`)
}
material.dispose()

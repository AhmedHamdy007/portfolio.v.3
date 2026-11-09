import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import * as THREE from 'three'

const source = readFileSync('src/components/experience/album/cameraMechanics.ts', 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  .replace(/from ['"]([^'"]+)['"]/g, (_, name) => 'from ' + JSON.stringify(import.meta.resolve(name)))
const { createCameraMechanics, updateCameraMechanics } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
const parts = createCameraMechanics()
const assembly = new THREE.Group()
assembly.add(parts.root, parts.barrelRoot)
let draws = 0, triangles = 0
const buffers = []
assembly.traverse(object => {
  if (!(object instanceof THREE.Mesh)) return
  draws++
  const g = object.geometry
  assert(g.boundingSphere && Number.isFinite(g.boundingSphere.radius))
  assert.equal(g.groups.length, 0, 'One material per batch')
  triangles += g.attributes.position.count / 3
  for (const name of ['position', 'normal', 'uv']) assert(Array.from(g.attributes[name].array).every(Number.isFinite), `Finite ${name}`)
  buffers.push([g, g.attributes.position.version])
})
assert.equal(draws, 8)
assert(triangles < 25000, `Bounded added geometry: ${triangles} triangles`)
const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
const ray = new THREE.Raycaster(new THREE.Vector3(0, 0, 10), new THREE.Vector3(0, 0, -1))
for (let i = 0; i <= 100; i++) {
  const open = i / 100
  updateCameraMechanics(parts, open)
  assert(Math.abs(parts.drive.rotation.z * 32 + (parts.pinion.rotation.z - Math.PI / 18) * 18) < 1e-10)
  parts.barrelRoot.position.z = open * 1.6
  parts.barrelRoot.rotation.z = open * 0.38
  assembly.updateMatrixWorld(true)
  assembly.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    const probe = new THREE.Mesh(object.geometry, material)
    probe.matrixWorld.copy(object.matrixWorld)
    assert.equal(ray.intersectObject(probe).length, 0, 'Added details leave optical axis clear')
  })
}
updateCameraMechanics(parts, 0.4)
const forward = [parts.drive.rotation.z, parts.pinion.rotation.z, parts.advance.rotation.y]
updateCameraMechanics(parts, 1); updateCameraMechanics(parts, 0.4)
assert.deepEqual([parts.drive.rotation.z, parts.pinion.rotation.z, parts.advance.rotation.y], forward, 'No accumulated drift on reverse scroll')
for (const [geometry, version] of buffers) assert.equal(geometry.attributes.position.version, version, 'No per-frame geometry uploads')
let disposed = 0
buffers.forEach(([g]) => g.addEventListener('dispose', () => disposed++))
parts.dispose(); material.dispose()
assert.equal(disposed, 8)
console.log(`Camera mechanics: ${draws} batches, ${triangles.toLocaleString()} triangles, finite geometry, gear ratio, reverse motion, clear optical axis and disposal passed.`)

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import * as THREE from 'three'

const file = readFileSync('src/components/models/thresholdLight.ts', 'utf8')
const code = ts.transpileModule(file, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  .replace("from 'three'", `from '${import.meta.resolve('three')}'`)
const { createThresholdLight, updateThresholdLight, thresholdPresence } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
const source = new THREE.MeshPhysicalMaterial({ color: '#ddd8c8', emissive: '#010203', emissiveIntensity: 0.3 })
const original = JSON.stringify(source.toJSON())
const effect = createThresholdLight(source)
assert.equal(effect.mesh.geometry.index.count / 3, 2)
assert.equal(effect.material.depthWrite, false)
assert.equal(effect.material.depthTest, true)
assert.equal(effect.material.forceSinglePass, true)
assert(effect.mesh.geometry.boundingSphere)
assert.notEqual(effect.frame, source); assert.notEqual(effect.handle, source)
const buffer = effect.mesh.geometry.attributes.position
const version = buffer.version
for (let i = 0; i <= 10000; i++) {
  const p = i / 10000, cameraY = -37 * THREE.MathUtils.clamp((p - 0.3) / 0.5, 0, 1)
  const angle = Math.PI / 2 * THREE.MathUtils.clamp((p - 0.5) / 0.1, 0, 1)
  const turn = THREE.MathUtils.clamp((p - 0.4) / 0.1, 0, 1)
  updateThresholdLight(effect, p, cameraY, angle, turn, false)
  const intensity = effect.material.uniforms.uPresence.value
  assert(Number.isFinite(intensity) && intensity >= 0 && intensity <= 1)
  assert.equal(effect.material.uniforms.uOpening.value, Math.sin(angle))
  updateThresholdLight(effect, 0.9, -37, Math.PI / 2, 1, false)
  updateThresholdLight(effect, p, cameraY, angle, turn, false)
  assert.equal(effect.material.uniforms.uPresence.value, intensity, 'Reverse scroll is deterministic')
}
assert.equal(buffer.version, version, 'Never upload/rebuild geometry on scroll')
assert.equal(thresholdPresence(0.3, -5), 0, 'No light in the hero')
assert.equal(thresholdPresence(0.65, -25), 0, 'Gone before crossing the sill')
updateThresholdLight(effect, 0.55, -18.5, Math.PI / 4, 1, true)
assert.equal(effect.mesh.visible, false, 'Never leaks into a portal')
assert.equal(effect.material.uniforms.uPresence.value, 0)
updateThresholdLight(effect, 0, 0, 0, 0, false, true)
assert.equal(effect.mesh.visible, true, 'Available for the existing loading warm-up')
assert.equal(effect.material.uniforms.uPresence.value, 0, 'Warm-up produces no visible light')
assert.equal(JSON.stringify(source.toJSON()), original, 'Cached GLTF material remains untouched')
let disposed = 0
for (const resource of [effect.mesh.geometry, effect.material, effect.frame, effect.handle]) resource.addEventListener('dispose', () => disposed++)
effect.dispose(); assert.equal(disposed, 4)
source.dispose()
console.log('Threshold light passed: 2 triangles, immutable source/buffers, 10,001 reversible poses, approach/crossing/portal gates, warm-up and resource disposal.')

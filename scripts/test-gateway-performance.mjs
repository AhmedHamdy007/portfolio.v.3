import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import * as THREE from 'three'

async function load(path) {
  const code = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    .replaceAll("from 'three'", `from '${import.meta.resolve('three')}'`)
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
}
const { createGatewayGeometry } = await load('src/components/experience/gatewayGeometry.ts')
const surfaces = createGatewayGeometry(2.65, 3.65)
const root = new THREE.Group()
root.position.set(0, -41.5, 12); root.rotation.x = -Math.PI / 2
const anchor = new THREE.Group(); anchor.position.set(3, -1.1, 0); root.add(anchor)
root.updateMatrixWorld(true)
const anchorMatrix = anchor.matrixWorld.clone()
const matrix = new THREE.Matrix4(), euler = new THREE.Euler(), point = new THREE.Vector3(), expected = new THREE.Vector3()
let vertices = 0
for (const { geometry } of surfaces) {
  vertices += geometry.attributes.position.count
  const mesh = new THREE.Mesh(geometry); mesh.matrixAutoUpdate = false; anchor.add(mesh)
  const version = geometry.attributes.position.version
  for (let i = 0; i <= 30; i++) {
    matrix.makeRotationFromEuler(euler.set(0.1 + i / 100, -0.34 + i / 150, 0.13))
    matrix.setPosition(0, i / 200, -0.5)
    mesh.matrix.copy(matrix); root.updateMatrixWorld(true)
    const old = geometry.clone().applyMatrix4(matrix)
    for (let j = 0; j < geometry.attributes.position.count; j++) {
      point.fromBufferAttribute(geometry.attributes.position, j).applyMatrix4(mesh.matrixWorld)
      expected.fromBufferAttribute(old.attributes.position, j).applyMatrix4(anchorMatrix)
      assert(point.distanceTo(expected) < 0.000002, 'Same world-space vertices as the former CPU transformation')
    }
    old.dispose()
    assert(anchor.matrixWorld.equals(anchorMatrix), 'Portal world does not inherit aperture tilt')
  }
  assert.equal(geometry.attributes.position.version, version, 'No per-frame vertex upload')
  anchor.remove(mesh)
}
// Microbenchmark isolates former CPU geometry work, not browser/GPU frame rate.
const oldSurfaces = surfaces.map(({ geometry }) => ({ geometry: geometry.clone(), position: geometry.attributes.position.clone(), normal: geometry.attributes.normal.clone() }))
const frames = 240
let start = performance.now()
for (let i = 0; i < frames; i++) {
  matrix.makeRotationFromEuler(euler.set(i / 1000, 0.3, 0.1))
  for (let tile = 0; tile < 3; tile++) for (const s of oldSurfaces) {
    s.geometry.attributes.position.copy(s.position); s.geometry.attributes.normal.copy(s.normal)
    s.geometry.applyMatrix4(matrix); s.geometry.computeBoundingSphere()
  }
}
const oldMs = performance.now() - start
const meshes = [new THREE.Mesh(), new THREE.Mesh(), new THREE.Mesh()]
start = performance.now()
for (let i = 0; i < frames; i++) {
  matrix.makeRotationFromEuler(euler.set(i / 1000, 0.3, 0.1))
  meshes.forEach(mesh => { mesh.matrix.copy(matrix); mesh.matrixWorldNeedsUpdate = true })
}
const newMs = performance.now() - start
console.log(`Gateway transforms: ${vertices * 3} vertices no longer rewritten per moving frame. ${frames}-frame CPU microbenchmark: ${oldMs.toFixed(2)}ms → ${newMs.toFixed(2)}ms (not FPS).`)
surfaces.forEach(s => s.geometry.dispose()); oldSurfaces.forEach(s => s.geometry.dispose())

const { registerPortalWarmup, warmPortalPreviews, warmPortalScene } = await load('src/components/experience/portalWarmup.ts')
const originalRAF = globalThis.requestAnimationFrame
globalThis.requestAnimationFrame = fn => { queueMicrotask(fn); return 1 }
try {
  const gl = {}, order = []
  const unregisterA = registerPortalWarmup(gl, async () => { order.push('a-start'); await Promise.resolve(); order.push('a-end') })
  const unregisterB = registerPortalWarmup(gl, async () => { order.push('b') })
  const unregisterC = registerPortalWarmup(gl, async () => { order.push('removed') }); unregisterC()
  await warmPortalPreviews(gl, () => false)
  assert.deepEqual(order, ['a-start', 'a-end', 'b'], 'Sequential, paint-separated work; removed jobs skipped')
  order.length = 0; await warmPortalPreviews(gl, () => true); assert.equal(order.length, 0)
  unregisterA(); unregisterB()
} finally { globalThis.requestAnimationFrame = originalRAF }
for (const fail of [false, true]) {
  const scene = new THREE.Scene(), previous = {}, matrices = scene.matrixWorld.clone()
  let bound = previous, disposed = false
  const gl = {
    autoClear: false, compileAsync: async () => {}, getRenderTarget: () => previous,
    getActiveCubeFace: () => 0, getActiveMipmapLevel: () => 0,
    setRenderTarget(target) { bound = target; if (target !== previous) target.addEventListener('dispose', () => { disposed = true }) },
    render() { if (fail) throw Error('render failed') },
  }
  if (fail) await assert.rejects(warmPortalScene(gl, scene, () => false))
  else await warmPortalScene(gl, scene, () => false)
  assert.equal(bound, previous); assert.equal(gl.autoClear, false); assert(disposed); assert(scene.matrixWorld.equals(matrices))
}
const tileSource = readFileSync('src/components/experience/GridTile.tsx', 'utf8')
assert(!tileSource.includes('geometry.applyMatrix4'), 'Keep dense gateway buffers static')
assert(tileSource.includes('anchor={anchorRef}'), 'Aperture and portal-world anchors are separate')
console.log('Gateway checks passed: visual transform equivalence, stable anchors/buffers, sequential warm-up, cancellation, and render-state cleanup.')

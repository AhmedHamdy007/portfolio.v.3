import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { PerspectiveCamera, Euler } from 'three'

async function load(path) {
  let code = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  for (const module of ['three', 'zustand', 'zustand/middleware']) code = code.replaceAll(`from '${module}'`, `from '${import.meta.resolve(module)}'`)
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
}
const { capturePortalCamera, returnPortalCamera } = await load('src/components/experience/portalTransition.ts')
const { usePortalStore } = await load('src/store.ts')
for (const id of ['album', 'work', 'projects']) {
  usePortalStore.getState().setActivePortal(id)
  usePortalStore.getState().setActivePortal(null)
  assert.equal(usePortalStore.getState().activePortalId, id, 'Keep the outgoing world mounted')
  assert.equal(usePortalStore.getState().isClosing, true)
  usePortalStore.getState().setActivePortal(null)
  usePortalStore.getState().setActivePortal('another')
  usePortalStore.getState().finishPortalExit('wrong')
  assert.equal(usePortalStore.getState().activePortalId, id, 'Repeated clicks cannot interrupt the return')
  usePortalStore.getState().finishPortalExit(id)
  assert.equal(usePortalStore.getState().activePortalId, null)
  assert.equal(usePortalStore.getState().isClosing, false)
}
const camera = new PerspectiveCamera(75)
camera.position.set(0, -37, 13)
camera.quaternion.setFromEuler(new Euler(-Math.PI / 2, 0, 0))
const home = capturePortalCamera(camera)
camera.position.set(-14, -62, -25)
camera.quaternion.setFromEuler(new Euler(1.1, -2.4, 0.28))
camera.fov = 48
const portal = capturePortalCamera(camera)
let previous = portal.quaternion.clone()
for (let i = 0; i <= 1000; i++) {
  returnPortalCamera(camera, portal, home, i / 1000)
  assert([...camera.position, ...camera.quaternion, camera.fov].every(Number.isFinite))
  assert(camera.quaternion.angleTo(previous) < 0.004, 'No orientation snap or Euler wrap')
  previous.copy(camera.quaternion)
}
assert(camera.position.distanceTo(home.position) < 1e-8)
assert(camera.quaternion.angleTo(home.quaternion) < 1e-7)
assert.equal(camera.fov, home.fov)
assert(camera.up.distanceTo(home.up) < 1e-8)
console.log('Portal exits passed: all three closing lifecycles, repeated clicks, 1,001 camera return samples, exact pose/FOV restoration.')

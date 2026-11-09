import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { PerspectiveCamera, Scene } from 'three'

const code = ts.transpileModule(readFileSync('src/components/three/warmOpening.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText.replace("from 'three'", `from '${import.meta.resolve('three')}'`)
const { warmOpening } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const camera = new PerspectiveCamera(75, 16 / 9)
camera.position.set(0, 0, 5)
const original = camera.clone()
const scene = new Scene()
for (const mode of ['success', 'cancelled', 'render-error', 'compile-error']) {
  const previous = { existingTarget: true }
  let bound = previous, disposed = false, draws = 0, compiled = false
  const renderer = {
    compileAsync: async () => { if (mode === 'compile-error') throw Error('compile'); compiled = true },
    getRenderTarget: () => previous,
    getActiveCubeFace: () => 2,
    getActiveMipmapLevel: () => 1,
    setRenderTarget: (target, face, mip) => {
      bound = target
      if (target === previous) { assert.equal(face, 2); assert.equal(mip, 1) }
      else { assert.equal(target.width, 64); target.addEventListener('dispose', () => { disposed = true }) }
    },
    render: (world, probe) => {
      assert(compiled); assert.equal(world, scene); assert.notEqual(probe, camera)
      assert.equal(probe.position.y, -21); draws++
      if (mode === 'render-error') throw Error('render')
    },
  }
  const task = warmOpening(renderer, scene, camera, () => mode === 'cancelled')
  if (mode.endsWith('error')) await assert.rejects(task)
  else await task
  assert.equal(bound, previous, 'Restore the existing render target even on failure')
  assert.equal(draws, mode === 'success' || mode === 'render-error' ? 1 : 0)
  assert.equal(disposed, draws > 0)
  assert(camera.position.equals(original.position)); assert(camera.quaternion.equals(original.quaternion))
  assert.equal(camera.fov, original.fov)
}
console.log('Opening warm-up passed: one small draw, unchanged live camera, cancellation, compile/render failures, target restoration and disposal.')

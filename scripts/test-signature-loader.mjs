import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import ts from 'typescript'

const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const code = compile(readFileSync('src/components/chrome/loadingState.ts', 'utf8'))
  .replace(/from 'zustand'/g, `from '${import.meta.resolve('zustand')}'`)
const { advanceLoadingCounter, loadingTarget, useLoadingState } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
assert.equal(loadingTarget(0, 0, false, false), 0)
assert.equal(loadingTarget(100, 1, true, true), 99, '100 is reserved for the actual reveal')
assert.equal(loadingTarget(NaN, 0, false, false), 0)
for (let p = -100; p <= 200; p++) {
  const target = loadingTarget(p, 1, true, true)
  assert(Number.isFinite(target) && target >= 0 && target <= 99)
}
assert.equal(useLoadingState.getState().phase, 'loading')
assert.equal(useLoadingState.getState().sceneReady, false)
assert.equal(advanceLoadingCounter(81, 99, 0.5), 95, 'Moves past 81 at a steady rate')
assert.equal(advanceLoadingCounter(81, 81, 10), 81, 'Never invents pending asset progress')
assert.equal(advanceLoadingCounter(81, 20, 1), 81, 'New load batches never move the display backwards')
assert.equal(advanceLoadingCounter(81, 100, 5), 99, 'Reveal still owns 100')
assert.equal(advanceLoadingCounter(81, NaN, 1), 81)
assert.equal(advanceLoadingCounter(81, 99, -1), 81)
for (const fps of [15, 30, 60, 120]) {
  let value = 1
  for (let frame = 0; frame < fps * 2; frame++) value = advanceLoadingCounter(value, 99, 1 / fps)
  assert(Math.abs(value - 57) < 0.00001, 'Counter speed is independent of frame rate')
}
const albumCode = compile(readFileSync('src/constants/album.ts', 'utf8'))
const { DRIFT_MOMENTS } = await import(`data:text/javascript;base64,${Buffer.from(albumCode).toString('base64')}`)
const source = readFileSync('src/components/chrome/Preloader.tsx', 'utf8')
const indices = JSON.parse(source.match(/const CONTACT_SHEETS = (\[[^\]]+\])/)[1])
assert.equal(new Set(indices).size, 8)
let bytes = 0
for (const index of indices) {
  const file = `public${DRIFT_MOMENTS[index].src}`
  const size = statSync(file).size
  assert(size < 350_000, 'Reuse lightweight photos, not high-resolution originals')
  bytes += size
}
assert(bytes < 1_500_000)
const sceneSource = readFileSync('src/components/three/Scene.tsx', 'utf8')
assert(sceneSource.includes("lazy(() => import('./ExperienceSection'))"), 'Heavy portal imports stay off the startup path')
assert(!/import ExperienceSection from/.test(sceneSource), 'No eager portal import may restart GLB preloads during the intro')
assert(sceneSource.includes("state.phase === 'entered'"), 'Deferred worlds wait until the loader has exited')
assert(sceneSource.includes('<Suspense fallback={null}><ExperienceSection /></Suspense>'), 'Later assets cannot suspend the visible hero')
const bridgeSource = readFileSync('src/components/three/ScrollLayerBridge.tsx', 'utf8')
assert(bridgeSource.includes('if (!active && connected !== scroll.el) connect?.(scroll.el)'), 'Late portals must not steal homepage scroll events')
const heroSource = readFileSync('src/components/three/Hero.tsx', 'utf8')
assert(heroSource.includes('texture="/cloud.png"'), 'The opening clouds must not depend on a remote image CDN')
assert.deepEqual([...readFileSync('public/cloud.png').subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
console.log(`Signature loader checks passed: bounded progress, initial readiness, 8 local photos (${Math.round(bytes / 1024)} KB total).`)

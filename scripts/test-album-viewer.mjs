import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const code = ts.transpileModule(readFileSync('src/components/experience/album/viewerLayout.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText
const { focusDimensions, frameAdvance } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
let samples = 0
for (const viewportAspect of [320 / 844, 390 / 844, 768 / 1024, 1280 / 720, 2560 / 1080]) {
  for (const fov of [42, 49, 54, 61]) for (const aspect of [0.5, 0.6667, 0.75, 1, 1.5, 1.7778, 2]) {
    const { width, height, visibleHeight } = focusDimensions(aspect, viewportAspect, fov)
    assert(Math.abs(width / height - aspect) < 1e-9, 'No photograph distortion')
    assert(height <= visibleHeight * 0.60001)
    assert(width <= visibleHeight * viewportAspect * 0.87001)
    const originalHeight = aspect >= 1 ? 2.15 / aspect : 2.3
    const originalWidth = originalHeight * aspect
    const oldFit = Math.min(visibleHeight * 0.6 / originalHeight, visibleHeight * viewportAspect * 0.87 / originalWidth)
    assert(Math.abs(height - originalHeight * oldFit) < 1e-9, 'Approved photo fit remains unchanged')
    const detail = Math.min(1, visibleHeight * viewportAspect / 1.1)
    const outerHalfWidth = width / 2 + visibleHeight * Math.min(0.012, viewportAspect * 0.006) + 0.05 * detail
    assert(outerHalfWidth < visibleHeight * viewportAspect / 2, 'Registration rails stay in viewport')
    samples++
  }
}
assert.equal(frameAdvance(15, 0, 16), 1)
assert.equal(frameAdvance(0, 15, 16), -1)
for (let previous = 0; previous < 16; previous++) for (let next = 0; next < 16; next++) {
  const step = frameAdvance(previous, next, 16)
  assert(Math.abs(step) <= 8)
  assert.equal((previous + step + 16) % 16, next)
}
console.log(`Viewer checks passed: ${samples} responsive optical fits; 256 reversible frame advances.`)

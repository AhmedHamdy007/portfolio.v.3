import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const read = path => readFileSync(`src/components/${path}`, 'utf8')
const code = ts.transpileModule(read('three/cameraMotion.ts'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const { followPointerYaw } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
for (const pointer of [-1, 0, 1]) {
  for (const start of [-0.5, 0, 0.8]) {
    const old60 = start * Math.exp(-7 / 60) * 0.95 - pointer * Math.PI / 90 * 0.05
    assert(Math.abs(followPointerYaw(start, pointer, 1 / 60, false) - old60) < 1e-12)
    const results = [30, 60, 144].map(hz => {
      let yaw = start
      for (let i = 0; i < hz; i++) yaw = followPointerYaw(yaw, pointer, 1 / hz, false)
      return yaw
    })
    assert(Math.max(...results) - Math.min(...results) < 1e-12, 'Same one-second response at 30/60/144 Hz')
    assert.equal(followPointerYaw(start, pointer, 0, false), start)
    assert(Math.abs(followPointerYaw(start, pointer, 1, true) - start * Math.exp(-7)) < 1e-12)
  }
}
const bridge = read('three/ScrollLayerBridge.tsx')
assert(bridge.includes("overflowY: active ? 'hidden' : 'auto'"), 'Outer scroll locks for every portal, including Projects')
assert(!bridge.includes('outer.style.'), 'Nested worlds cannot independently unlock the homepage')
assert(bridge.includes('event.defaultPrevented || portal.activePortalId !== id'), 'Stale handlers and cancelled wheels cannot move a second scroll layer')
assert(bridge.includes('!album.entryReady || album.selected !== null || album.indexOpen'), 'Residual progress pauses while album interactions own input')
assert(!read('experience/projects/ProjectsPortal.tsx').includes('style.overflow'), 'Projects does not race the common scroll owner')
assert(bridge.includes("const receivesPointer = !active || active === 'projects'"), 'Projects keeps its inherited click/pan surface while its scrollbar is locked')
for (const portal of ['work/WorkPortal', 'album/AlbumPortal']) {
  assert(read(`experience/${portal}.tsx`).includes("style={{ overflowY: 'hidden', touchAction: 'none' }}"), 'Drei mount must not overwrite the inactive layer lock')
}
assert.equal((read('three/CameraRig.tsx').match(/camera.rotation.y =/g) || []).length, 1, 'Only one yaw writer')
assert(read('chrome/OverlayPanel.tsx').includes('During his internship, I intentionally assigned him tasks that would normally be considered beyond the scope of an intern. Rather than being discouraged, he approached every challenge with determination and persistence until he successfully delivered the expected results.'))
console.log('Scroll ownership source guards, exact testimonial, and 30/60/144 Hz yaw equivalence passed (not an FPS benchmark).')

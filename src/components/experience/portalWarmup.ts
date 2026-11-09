import * as THREE from 'three'

type Job = (cancelled: () => boolean) => Promise<void>
const queues = new WeakMap<THREE.WebGLRenderer, Set<Job>>()

export function registerPortalWarmup(gl: THREE.WebGLRenderer, job: Job) {
  let queue = queues.get(gl)
  if (!queue) { queue = new Set(); queues.set(gl, queue) }
  queue.add(job)
  return () => { queue.delete(job) }
}

// Each portal owns a separate Three.Scene; compiling the main world misses them.
export async function warmPortalPreviews(gl: THREE.WebGLRenderer, cancelled: () => boolean) {
  const queue = queues.get(gl)
  if (!queue) return
  for (const job of [...queue]) {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    if (cancelled()) return
    if (!queue.has(job)) continue
    try { await job(cancelled) }
    catch (error) { console.warn('Portal warm-up unavailable; using normal rendering.', error) }
  }
}

export async function warmPortalScene(gl: THREE.WebGLRenderer, scene: THREE.Scene, cancelled: () => boolean) {
  const probe = new THREE.PerspectiveCamera(75, 1, 0.1, 2000)
  probe.position.set(0, 0, 10).applyMatrix4(scene.matrixWorld)
  probe.quaternion.setFromRotationMatrix(scene.matrixWorld)
  probe.updateMatrixWorld()
  await gl.compileAsync(scene, probe)
  if (cancelled()) return
  const target = new THREE.WebGLRenderTarget(64, 64, { type: THREE.HalfFloatType })
  const previous = gl.getRenderTarget()
  const face = gl.getActiveCubeFace(), mip = gl.getActiveMipmapLevel()
  const autoClear = gl.autoClear
  try {
    gl.autoClear = true
    gl.setRenderTarget(target)
    gl.render(scene, probe)
  } finally {
    gl.setRenderTarget(previous, face, mip)
    gl.autoClear = autoClear
    target.dispose()
  }
}

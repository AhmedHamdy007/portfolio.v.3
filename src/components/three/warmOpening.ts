import * as THREE from 'three'

/** Upload the approaching door without moving the live camera or scroll state. */
export async function warmOpening(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, cancelled: () => boolean) {
  // The deferred gateway adds lights after the initial hero compile. Compile
  // against that final light set, including the still-offscreen door material.
  await gl.compileAsync(scene, camera)
  if (cancelled()) return
  const probe = camera.clone()
  probe.position.set(0, -21, 5.69)
  probe.rotation.set(-Math.PI / 2, 0, 0)
  probe.updateMatrixWorld()
  const target = new THREE.WebGLRenderTarget(64, 64)
  const previous = gl.getRenderTarget()
  const face = gl.getActiveCubeFace()
  const mip = gl.getActiveMipmapLevel()
  try {
    // Compilation alone does not upload vertex buffers and model textures.
    // A small draw behind the loader pays that first-use cost before scrolling.
    gl.setRenderTarget(target)
    gl.render(scene, probe)
  } finally {
    gl.setRenderTarget(previous, face, mip)
    target.dispose()
  }
}

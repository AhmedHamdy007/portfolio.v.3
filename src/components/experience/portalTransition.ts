import { Camera, PerspectiveCamera, MathUtils } from 'three'

export function capturePortalCamera(camera: Camera) {
  return {
    position: camera.position.clone(), quaternion: camera.quaternion.clone(),
    up: camera.up.clone(), fov: camera instanceof PerspectiveCamera ? camera.fov : 75,
  }
}

export function returnPortalCamera(camera: Camera, from: ReturnType<typeof capturePortalCamera>, to: ReturnType<typeof capturePortalCamera>, progress: number) {
  const p = MathUtils.clamp(progress, 0, 1)
  camera.position.lerpVectors(from.position, to.position, p)
  camera.quaternion.slerpQuaternions(from.quaternion, to.quaternion, p)
  camera.up.lerpVectors(from.up, to.up, p).normalize()
  if (camera instanceof PerspectiveCamera) {
    camera.fov = MathUtils.lerp(from.fov, to.fov, p)
    camera.updateProjectionMatrix()
  }
  camera.updateMatrixWorld(true)
}

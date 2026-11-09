/** Shared optical plane: the photograph and its mechanical gate cannot drift apart. */
export const FOCUS_DEPTH = 1.6
export const FOCUS_Y = 0.14

export function focusDimensions(aspect: number, viewportAspect: number, fov: number) {
  const visibleHeight = 2 * Math.tan(fov * Math.PI / 360) * FOCUS_DEPTH
  const height = Math.min(visibleHeight * 0.60, visibleHeight * viewportAspect * 0.87 / aspect)
  return { width: height * aspect, height, visibleHeight }
}

/** Advance across the wrap boundary without making the wheel unwind fifteen frames. */
export function frameAdvance(previous: number, next: number, count: number) {
  return ((next - previous + count * 1.5) % count) - count / 2
}

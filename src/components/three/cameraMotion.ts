// Equivalent to the former two yaw updates at 60 Hz, combined into a single
// exponential response. Preserve the subtle tilt, independent of refresh rate.
const YAW_DECAY_60 = Math.exp(-7 / 60) * 0.95
const YAW_RATE = -60 * Math.log(YAW_DECAY_60)
const YAW_GAIN = 0.05 / (1 - YAW_DECAY_60)

export function followPointerYaw(current: number, pointerX: number, delta: number, mobile: boolean) {
  const target = mobile ? 0 : -pointerX * Math.PI / 90 * YAW_GAIN
  const rate = mobile ? 7 : YAW_RATE
  return target + (current - target) * Math.exp(-rate * Math.max(0, delta))
}

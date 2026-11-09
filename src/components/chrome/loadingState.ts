import { create } from 'zustand'

export const useLoadingState = create<{
  sceneReady: boolean
  experienceReady: boolean
  phase: 'loading' | 'revealing' | 'entered'
}>(() => ({ sceneReady: false, experienceReady: false, phase: 'loading' }))

export function loadingTarget(progress: number, photos: number, documentReady: boolean, sceneReady: boolean) {
  const assets = Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0
  // Item-based progress, not a fabricated download-byte percentage.
  return Math.min(99, assets * 0.85 + Math.min(1, Math.max(0, photos)) * 5 + (documentReady ? 5 : 0) + (sceneReady ? 4 : 0))
}

// Constant-speed presentation of completed work: no restarting eases, backwards
// jumps, or invented progress while a real asset is still pending.
export function advanceLoadingCounter(current: number, target: number, elapsedSeconds: number) {
  const ceiling = Math.max(current, Math.min(99, Number.isFinite(target) ? target : current))
  const elapsed = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0
  return Math.min(ceiling, current + elapsed * 28)
}

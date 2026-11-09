import { createContext, useContext, useRef } from 'react'
import { useFrame, type RenderCallback } from '@react-three/fiber'

// RenderTexture's frames={0} stops GPU draws, not its children's useFrame work.
export const PortalActivity = createContext(true)

export function usePortalFrame(callback: RenderCallback, priority = 0) {
  const rendering = useContext(PortalActivity)
  const initialized = useRef(false)
  useFrame((state, delta, frame) => {
    // Initialize once while hidden; resume on the first visible frame.
    if (!rendering && initialized.current) return
    initialized.current = true
    callback(state, delta, frame)
  }, priority)
}

import { useGLTF } from '@react-three/drei'

// The supplied window and Dali files use Draco compression. Keeping the
// decoder beside the app avoids a CDN dependency during the initial journey.
useGLTF.setDecoderPath('/draco/')

export function preloadPortfolioModels() {
  useGLTF.preload('/models/window.glb')
  useGLTF.preload('/models/dalithe_persistence_of_memory.glb')
  useGLTF.preload('/models/wanderer_above_the_sea_of_fog.glb')
}

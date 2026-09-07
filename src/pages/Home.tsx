import Scene from '@/components/three/Scene'
import OverlayPanel from '@/components/chrome/OverlayPanel'
import Preloader from '@/components/chrome/Preloader'
import GrainOverlay from '@/components/chrome/GrainOverlay'
import AvailabilityBadge from '@/components/chrome/AvailabilityBadge'

export default function Home() {
  return (
    <Scene>
      <GrainOverlay />
      <AvailabilityBadge />
      <OverlayPanel />
      <Preloader />
    </Scene>
  )
}

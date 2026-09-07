import { ScrollControls } from '@react-three/drei'
import * as THREE from 'three'
import { usePortalStore, useScrollStore } from '@/store'
import { Memory } from '@/components/models/Memory'
import { NestedScrollLayer } from '@/components/three/ScrollLayerBridge'
import Timeline from './Timeline'

/** Reference portal handoff: swap the nested scroll layer above the page layer. */
export default function WorkPortal() {
  const isActive = usePortalStore((state) => state.activePortalId === 'work')
  // The live preview must not reconcile its model/text on every outer or album frame.
  const setScrollProgress = useScrollStore(state => state.setScrollProgress)

  return (
    <group>
      <mesh receiveShadow>
        <planeGeometry args={[4, 4, 1]} />
        <shadowMaterial opacity={0.1} />
      </mesh>
      <ScrollControls pages={2} damping={0.4} maxSpeed={0.4}>
        <NestedScrollLayer id="work" active={isActive} onProgress={setScrollProgress} />
        <Memory scale={new THREE.Vector3(5, 5, 5)} position={new THREE.Vector3(0, -6, 1)} />
        <Timeline />
      </ScrollControls>
    </group>
  )
}

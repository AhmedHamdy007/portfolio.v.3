/**
 * Animated film-grain texture layer. Pure CSS/SVG — sits above the canvas
 * and portal overlays, below the cursor, at very low opacity.
 */
export default function GrainOverlay() {
  return <div aria-hidden="true" className="grain-overlay" />
}

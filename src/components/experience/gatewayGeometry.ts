import * as THREE from 'three'

// Opposing sweeping corners make a lens-like opening, not a UI card.
export function gatewayShape(width: number, height: number) {
  const x = width / 2, y = height / 2
  const large = width * 0.43, small = 0.07
  const shape = new THREE.Shape()
  shape.moveTo(-x + small, -y)
  shape.lineTo(x - large, -y)
  shape.quadraticCurveTo(x, -y, x, -y + large)
  shape.lineTo(x, y - small)
  shape.quadraticCurveTo(x, y, x - small, y)
  shape.lineTo(-x + large, y)
  shape.quadraticCurveTo(-x, y, -x, y - large)
  shape.lineTo(-x, -y + small)
  shape.quadraticCurveTo(-x, -y, -x + small, -y)
  return shape
}

export function createGatewayGeometry(width: number, height: number) {
  const shape = gatewayShape(width, height)
  const surface = new THREE.ShapeGeometry(shape, 20)
  const rim = gatewayShape(width + 0.045, height + 0.045)
  rim.holes.push(new THREE.Path(shape.getPoints(20).reverse()))
  const frame = new THREE.ExtrudeGeometry(rim, {
    depth: 0.09, steps: 1, curveSegments: 20,
    bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2,
  })
  frame.translate(0, 0, -0.1)
  return [surface, frame].map(geometry => {
    geometry.computeBoundingSphere()
    return { geometry }
  })
}

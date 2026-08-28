import * as THREE from 'three'
import { merge } from './merge'
import { CAR } from './body'

/**
 * Wheels are built around the Z axis (the car's lateral axis), so the mesh can
 * simply spin about Z to roll. LatheGeometry revolves around Y, so every
 * lathed part gets rotated a quarter turn about X.
 */
function lathe(points: THREE.Vector2[], segments = 64) {
  const g = new THREE.LatheGeometry(points, segments)
  g.rotateX(Math.PI / 2)
  return g
}

export function buildTire(width: number, radius = CAR.wheelRadius) {
  const w = width / 2
  const bead = radius * 0.74 // low-profile sidewall
  return lathe(
    [
      new THREE.Vector2(bead, -w),
      new THREE.Vector2(radius * 0.9, -w * 1.01),
      new THREE.Vector2(radius * 0.97, -w * 0.93),
      new THREE.Vector2(radius, -w * 0.62),
      new THREE.Vector2(radius, w * 0.62),
      new THREE.Vector2(radius * 0.97, w * 0.93),
      new THREE.Vector2(radius * 0.9, w * 1.01),
      new THREE.Vector2(bead, w),
    ],
    72
  )
}

export function buildRim(width: number, radius = CAR.wheelRadius) {
  const w = width / 2
  const parts: THREE.BufferGeometry[] = []

  // Barrel and outer lip
  parts.push(
    lathe(
      [
        new THREE.Vector2(radius * 0.3, -w * 0.92),
        new THREE.Vector2(radius * 0.68, -w * 0.96),
        new THREE.Vector2(radius * 0.72, -w * 0.5),
        new THREE.Vector2(radius * 0.735, w * 0.7),
        new THREE.Vector2(radius * 0.755, w * 0.99),
        new THREE.Vector2(radius * 0.69, w * 1.0),
        new THREE.Vector2(radius * 0.64, w * 0.9),
      ],
      64
    )
  )

  // Spokes: a tapered blade extruded along the axle, repeated around it.
  const spokes = 10
  const shape = new THREE.Shape()
  shape.moveTo(-radius * 0.115, radius * 0.2)
  shape.lineTo(radius * 0.115, radius * 0.2)
  shape.lineTo(radius * 0.055, radius * 0.71)
  shape.lineTo(-radius * 0.055, radius * 0.71)
  shape.closePath()
  const blade = new THREE.ExtrudeGeometry(shape, {
    depth: radius * 0.1,
    bevelEnabled: true,
    bevelSize: radius * 0.016,
    bevelThickness: radius * 0.016,
    bevelSegments: 2,
  })
  for (let i = 0; i < spokes; i++) {
    const g = blade.clone()
    g.rotateZ((i / spokes) * Math.PI * 2)
    g.translate(0, 0, w * 0.32)
    parts.push(g)
  }
  blade.dispose()

  // Centre lock
  const hub = new THREE.CylinderGeometry(radius * 0.2, radius * 0.23, radius * 0.14, 32)
  hub.rotateX(Math.PI / 2)
  hub.translate(0, 0, w * 0.55)
  parts.push(hub)

  return merge(parts)
}

export function buildBrake(radius = CAR.wheelRadius) {
  const disc = new THREE.CylinderGeometry(radius * 0.64, radius * 0.64, radius * 0.08, 48)
  disc.rotateX(Math.PI / 2)
  return disc
}

export function buildCaliper(radius = CAR.wheelRadius) {
  const g = new THREE.BoxGeometry(radius * 0.28, radius * 0.42, radius * 0.16)
  g.translate(-radius * 0.1, radius * 0.5, 0)
  return g
}

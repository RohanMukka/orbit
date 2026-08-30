import * as THREE from 'three'
import { merge } from './merge'
import { CAR, bodyPoint, canopySpan, intakeAperture, INTAKE_CENTRE } from './body'

const tube = (pts: THREE.Vector3[], radius: number, radial = 8) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, radius, radial, false)

/** Full-width tail blade — the car's signature at night. */
export function buildTailLight() {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= 24; i++) {
    const t = (i / 24) * 2 - 1
    pts.push(new THREE.Vector3(-2.2 - 0.13 * (1 - t * t), 0.86 - 0.03 * t * t, t * 0.7))
  }
  return tube(pts, 0.022, 10)
}

/** The path each headlight blade follows, from the fender top into the nose. */
function headLightPath(s: number) {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= 20; i++) {
    const t = i / 20
    pts.push(
      new THREE.Vector3(1.68 + t * 0.56, 0.74 - t * t * 0.16, s * (0.83 - t * 0.4 - t * t * 0.12))
    )
  }
  return pts
}

/** Two hooked blades that wrap from the fender tops into the nose. */
export function buildHeadLights() {
  return merge([tube(headLightPath(1), 0.019, 10), tube(headLightPath(-1), 0.019, 10)])
}

/**
 * A dark housing sunk under each blade. Without it the emissive tube sits on
 * the surface like a strip of tape — a real lamp has something behind the lens,
 * and the depth is most of what sells it.
 */
export function buildHeadLightHousings() {
  const cup = (s: number) =>
    tube(
      headLightPath(s).map((p) => new THREE.Vector3(p.x - 0.012, p.y - 0.006, p.z * 0.985)),
      0.032,
      12
    )
  return merge([cup(1), cup(-1)])
}

/**
 * Ducktail lip traced along the trailing edge of the engine deck. A free-
 * standing wing on struts reads as a plank hovering behind the car; a lip
 * that follows the body's own edge stays part of the shape.
 */
export function buildDucktail() {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= 40; i++) {
    const th = 0.78 + (i / 40) * (Math.PI - 1.56)
    const p = bodyPoint(0.06, th)
    pts.push(new THREE.Vector3(p.x - 0.015, p.y + 0.028, p.z))
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.4)
  return new THREE.TubeGeometry(curve, 96, 0.019, 8, false)
}

/** Camera-pod mirrors on thin stalks. */
export function buildMirrors() {
  const parts: THREE.BufferGeometry[] = []
  for (const s of [1, -1]) {
    const pod = new THREE.CapsuleGeometry(0.038, 0.085, 6, 14)
    pod.rotateZ(Math.PI / 2)
    pod.translate(0.88, 0.87, s * 1.0)
    parts.push(pod)
    const stalk = new THREE.CylinderGeometry(0.012, 0.016, 0.17, 10)
    stalk.rotateX(s * 0.5)
    stalk.translate(0.86, 0.82, s * 0.93)
    parts.push(stalk)
  }
  return merge(parts)
}

/** Front splitter — a carbon plane skimming the floor ahead of the axle. */
export function buildSplitter() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.5, -0.98)
  shape.quadraticCurveTo(0.36, -0.86, 0.6, -0.42)
  shape.quadraticCurveTo(0.72, 0, 0.6, 0.42)
  shape.quadraticCurveTo(0.36, 0.86, -0.5, 0.98)
  shape.closePath()
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: false, curveSegments: 20 })
  g.rotateX(Math.PI / 2)
  g.translate(1.78, 0.13, 0)
  return g
}

/** Rear diffuser: a ramp under the tail with vertical strakes. */
export function buildDiffuser() {
  const parts: THREE.BufferGeometry[] = []
  const ramp = new THREE.BoxGeometry(0.9, 0.035, 1.5)
  ramp.rotateZ(-0.2)
  ramp.translate(-1.85, 0.24, 0)
  parts.push(ramp)
  for (let i = -2; i <= 2; i++) {
    const strake = new THREE.BoxGeometry(0.86, 0.16, 0.028)
    strake.rotateZ(-0.2)
    strake.translate(-1.85, 0.28 + Math.abs(i) * 0.012, i * 0.32)
    parts.push(strake)
  }
  return merge(parts)
}

export const AXLES = [
  { x: CAR.frontAxle, width: CAR.wheelWidthFront, track: CAR.trackFront, front: true },
  { x: CAR.rearAxle, width: CAR.wheelWidthRear, track: CAR.trackRear, front: false },
]

/**
 * Trim tubes traced along the exact material boundaries. The shell's material
 * groups can only switch at quad edges, which leaves a visible staircase where
 * a boundary runs diagonally across the grid; a seal following the true curve
 * covers it, and reads as the window surround a real car would have anyway.
 */
function trimLoop(
  uA: number,
  uB: number,
  centre: (u: number) => number,
  span: (u: number) => number,
  radius: number,
  samples = 90
) {
  const pts: THREE.Vector3[] = []
  const edge = (u: number, sign: number) => {
    const p = bodyPoint(u, centre(u) + sign * span(u))
    return new THREE.Vector3(p.x, p.y, p.z)
  }
  for (let i = 0; i <= samples; i++) pts.push(edge(uA + ((uB - uA) * i) / samples, 1))
  for (let i = samples; i >= 0; i--) pts.push(edge(uA + ((uB - uA) * i) / samples, -1))
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal', 0.4)
  return new THREE.TubeGeometry(curve, samples * 2 + 8, radius, 6, true)
}

/**
 * A lip around each wheel arch — the highest-yield edge on a car body. Without
 * one the tyre dissolves into the dark underbody and the wheels read as
 * undersized even when the package is right (this car is 6.6 wheel diameters
 * long, which is nearly exactly a real mid-engined hypercar).
 *
 * The arch is already carved onto a circle at each axle, so the lip only has to
 * find where that circle meets the flank: walk the section at the arch height
 * and take the outermost point.
 */
export function buildArchLips() {
  const parts: THREE.BufferGeometry[] = []
  const R = CAR.archRadius
  const STEPS = 36
  const SCAN = 56

  for (const ax of [CAR.frontAxle, CAR.rearAxle]) {
    for (const side of [1, -1]) {
      const pts: THREE.Vector3[] = []
      for (let i = 0; i <= STEPS; i++) {
        const phi = (i / STEPS) * Math.PI
        const x = ax + R * Math.cos(phi)
        const archY = CAR.wheelRadius + Math.sin(phi) * R * 0.92
        const u = Math.min(1, Math.max(0, x / CAR.length + 0.5))

        let best: { y: number; z: number } | null = null
        let near: { d: number; y: number; z: number } | null = null
        for (let k = 0; k <= SCAN; k++) {
          const th = -1.5 + (k / SCAN) * 2.8
          const p = bodyPoint(u, th)
          const d = Math.abs(p.y - archY)
          if (!near || d < near.d) near = { d, y: p.y, z: p.z }
          if (d < 0.014 && (!best || Math.abs(p.z) > Math.abs(best.z))) best = { y: p.y, z: p.z }
        }
        const pick = best ?? near!
        pts.push(new THREE.Vector3(x, pick.y, side * Math.abs(pick.z) * 0.99))
      }
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.4)
      parts.push(new THREE.TubeGeometry(curve, STEPS * 3, 0.013, 6, false))
    }
  }
  return merge(parts)
}

export function buildCanopyTrim() {
  return trimLoop(0.409, 0.792, () => Math.PI / 2, canopySpan, 0.011)
}

export function buildIntakeTrim() {
  const sides = [INTAKE_CENTRE, Math.PI - INTAKE_CENTRE].map((c) =>
    trimLoop(0.217, 0.543, () => c, intakeAperture, 0.009, 70)
  )
  return merge(sides)
}

/** The procedural "engineering block" (skateboard chassis, battery pack, motors). */
export function buildChassis() {
  const parts: THREE.BufferGeometry[] = []

  const floor = new THREE.BoxGeometry(2.8, 0.12, 1.3)
  floor.translate(0.1, 0.22, 0)
  parts.push(floor)

  for (let z = -0.6; z <= 0.6; z += 0.15) {
    const ridge = new THREE.BoxGeometry(2.6, 0.14, 0.05)
    ridge.translate(0.1, 0.22, z)
    parts.push(ridge)
  }

  const fMotor = new THREE.CylinderGeometry(0.18, 0.18, 0.6, 16)
  fMotor.rotateX(Math.PI / 2)
  fMotor.translate(1.4, 0.35, 0)
  parts.push(fMotor)

  const fUnit = new THREE.BoxGeometry(0.4, 0.2, 0.5)
  fUnit.translate(1.4, 0.5, 0)
  parts.push(fUnit)

  const rMotor = new THREE.CylinderGeometry(0.22, 0.22, 0.7, 16)
  rMotor.rotateX(Math.PI / 2)
  rMotor.translate(-1.4, 0.38, 0)
  parts.push(rMotor)

  for (const s of [1, -1]) {
    const rail = new THREE.BoxGeometry(3.6, 0.08, 0.08)
    rail.translate(0.1, 0.3, s * 0.7)
    parts.push(rail)

    for (const a of AXLES) {
      const arm = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8)
      arm.rotateZ(Math.PI / 2)
      arm.rotateY(s * 0.3)
      arm.translate(a.x - 0.2, 0.35, s * 0.5)
      parts.push(arm)
    }
  }

  return merge(parts)
}

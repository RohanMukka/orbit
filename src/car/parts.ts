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

/** Two hooked blades that wrap from the fender tops into the nose. */
export function buildHeadLights() {
  const side = (s: number) => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      pts.push(
        new THREE.Vector3(
          1.68 + t * 0.56,
          0.74 - t * t * 0.16,
          s * (0.83 - t * 0.4 - t * t * 0.12)
        )
      )
    }
    return tube(pts, 0.019, 10)
  }
  return merge([side(1), side(-1)])
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

export function buildCanopyTrim() {
  return trimLoop(0.409, 0.792, () => Math.PI / 2, canopySpan, 0.011)
}

export function buildIntakeTrim() {
  const sides = [INTAKE_CENTRE, Math.PI - INTAKE_CENTRE].map((c) =>
    trimLoop(0.217, 0.543, () => c, intakeAperture, 0.009, 70)
  )
  return merge(sides)
}

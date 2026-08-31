import * as THREE from 'three'
import { merge } from './merge'
import { CAR, bodyPoint, canopySpan, intakeAperture, INTAKE_CENTRE } from './body'

const tube = (pts: THREE.Vector3[], radius: number, radial = 8) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, radius, radial, false)

export function buildTailLight() {
  const parts: THREE.BufferGeometry[] = []
  const U = 0.03 // one station in from the tail cap
  for (const s of [1, -1]) {
    // Two blades a side, stepped up the fascia. Positions come from the shell
    // rather than from constants: hand-picked coordinates put the old lamps
    // inside the body, and a lamp you cannot see is the one detail the eye
    // looks for first at the back of a car.
    for (const th of [0.34, 0.72]) {
      const p = bodyPoint(U, s > 0 ? th : Math.PI - th)
      const bar = new THREE.BoxGeometry(0.06, 0.07, 0.34)
      bar.translate(p.x - 0.03, p.y, p.z * 0.82)
      parts.push(bar)
    }
  }
  return merge(parts)
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

/** Rows of LED bulbs inside the headlight housing. */
export function buildHeadLights() {
  const parts: THREE.BufferGeometry[] = []
  for (const s of [1, -1]) {
    const path = headLightPath(s)
    for (let i = 2; i <= 16; i += 3) {
      const bulb = new THREE.SphereGeometry(0.018, 12, 12)
      bulb.translate(path[i].x - 0.01, path[i].y - 0.01, path[i].z)
      parts.push(bulb)
    }
  }
  return merge(parts)
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
 * Rear wing.
 *
 * It used to be a 2.1m box floating 30cm clear of the engine deck on two thin
 * struts set well inboard of its tips, which is why it read as a rectangle
 * pasted behind the car rather than a part bolted to it. Three things fix that,
 * and none of them is detail: an aerofoil section instead of a slab, so the
 * element catches light along a leading edge and shades away to a trailing one;
 * a span that stops inside the rear track instead of overhanging it; and struts
 * moved out under the loaded part of the wing, tall enough to actually reach
 * the deck they are supposed to be carrying it off.
 */
const WING = {
  x: -2.22,
  y: 1.14,
  span: 1.86,
  chord: 0.42,
  attack: 0.1,
}

/** Half an aerofoil sweep: flat-ish upper surface, cambered underside. */
function wingSection() {
  const s = new THREE.Shape()
  const c = WING.chord * 0.5
  s.moveTo(c, 0) // leading edge
  s.quadraticCurveTo(c * 0.1, 0.05, -c, 0.014) // upper surface
  s.lineTo(-c, -0.006) // trailing edge
  s.quadraticCurveTo(c * 0.1, -0.028, c, 0) // underside — the working face
  s.closePath()
  return s
}

export function buildDucktail() {
  const parts: THREE.BufferGeometry[] = []

  const wing = new THREE.ExtrudeGeometry(wingSection(), {
    depth: WING.span,
    bevelEnabled: false,
    curveSegments: 12,
  })
  wing.translate(0, 0, -WING.span / 2)
  wing.rotateZ(WING.attack)
  wing.translate(WING.x, WING.y, 0)
  parts.push(wing)

  for (const s of [1, -1]) {
    // Endplates, vertical and sized to the chord they close off.
    const endplate = new THREE.BoxGeometry(WING.chord * 1.24, 0.22, 0.022)
    endplate.rotateZ(WING.attack)
    endplate.translate(WING.x - 0.02, WING.y + 0.04, s * WING.span * 0.5)
    parts.push(endplate)

    /**
     * Swan-neck struts, out at 78% of the semi-span where the load is. Each one
     * runs from y = 0.86 — inside the engine deck, so the joint is buried
     * rather than hovering over it — up to the wing underside.
     */
    const foot = 0.86
    const height = WING.y - foot
    const strut = new THREE.BoxGeometry(0.1, height + 0.12, 0.038)
    strut.rotateZ(-0.16) // raked back
    strut.translate(WING.x + 0.03, foot + height * 0.5, s * WING.span * 0.39)
    parts.push(strut)
  }

  return merge(parts)
}

/**
 * Walks the tail ring for the point nearest a target height on one side. The
 * rear fascia is a flat cap, so anything laid across it is a straight chord —
 * but the chord's length depends on the loft, and hand-guessing it is how the
 * old tail lamps ended up buried inside the bodywork. Ask the surface instead.
 */
function tailPointAtHeight(u: number, targetY: number, side: number) {
  let best: { x: number; y: number; z: number } | null = null
  for (let k = 0; k <= 240; k++) {
    const t = k / 240
    const th = side > 0 ? -0.7 + t * 2.0 : Math.PI + 0.7 - t * 2.0
    const p = bodyPoint(u, th)
    if (!best || Math.abs(p.y - targetY) < Math.abs(best.y - targetY)) best = p
  }
  return best!
}

/**
 * Full-width tail bar. Four separate blades left the back of the car reading as
 * two unrelated pairs with a blank panel between them; one continuous light
 * across the fascia is the single strongest rear signature a modern car has,
 * and it gives the Kamm tail a horizontal to sit on.
 */
export function buildTailBar() {
  const U = 0 // the tail ring; anything forward of this is inside the car
  const Y = 0.8
  const r = tailPointAtHeight(U, Y, 1)
  const l = tailPointAtHeight(U, Y, -1)
  const halfSpan = Math.min(Math.abs(r.z), Math.abs(l.z)) * 0.86
  const bar = new THREE.BoxGeometry(0.05, 0.045, halfSpan * 2)
  bar.translate(r.x - 0.012, Y, 0)
  return bar
}

/** Slatted vent under the tail bar — the rear panel had nothing on it at all. */
export function buildRearVent() {
  const parts: THREE.BufferGeometry[] = []
  const U = 0
  for (let i = 0; i < 4; i++) {
    const y = 0.62 - i * 0.055
    const r = tailPointAtHeight(U, y, 1)
    const l = tailPointAtHeight(U, y, -1)
    const half = Math.min(Math.abs(r.z), Math.abs(l.z)) * 0.66
    if (half < 0.05) continue
    const slat = new THREE.BoxGeometry(0.035, 0.02, half * 2)
    slat.translate(r.x - 0.008, y, 0)
    parts.push(slat)
  }
  return merge(parts)
}

/**
 * Cockpit. The canopy was transmitting a dark environment through a dark tint,
 * so the glass came back as a black panel — glass only reads as glass when
 * there is something behind it to see. None of this needs to be accurate; it
 * needs to be legible at a glance through a windscreen.
 */
export function buildInterior() {
  const parts: THREE.BufferGeometry[] = []

  const pan = new THREE.BoxGeometry(1.7, 0.04, 1.05)
  pan.translate(0.34, 0.44, 0)
  parts.push(pan)

  const console_ = new THREE.BoxGeometry(0.86, 0.16, 0.17)
  console_.translate(0.42, 0.53, 0)
  parts.push(console_)

  // Dashboard and screen cowl, tucked under the windscreen header.
  const dash = new THREE.BoxGeometry(0.26, 0.17, 0.94)
  dash.rotateZ(-0.22)
  dash.translate(0.99, 0.73, 0)
  parts.push(dash)

  const wheelRim = new THREE.TorusGeometry(0.115, 0.017, 10, 26)
  wheelRim.rotateY(Math.PI / 2)
  wheelRim.rotateZ(0.34)
  wheelRim.translate(0.83, 0.73, 0.3)
  parts.push(wheelRim)

  for (const sd of [1, -1]) {
    const base = new THREE.BoxGeometry(0.52, 0.09, 0.44)
    base.translate(0.28, 0.52, sd * 0.3)
    parts.push(base)

    const back = new THREE.BoxGeometry(0.13, 0.46, 0.44)
    back.rotateZ(0.2)
    back.translate(-0.02, 0.74, sd * 0.3)
    parts.push(back)

    const headrest = new THREE.BoxGeometry(0.12, 0.15, 0.26)
    headrest.rotateZ(0.2)
    headrest.translate(-0.08, 0.98, sd * 0.3)
    parts.push(headrest)

    // Roll hoop behind each seat — reads through the rear of the canopy.
    // Crown must clear the roofline: roof is 1.131 at this station, and the
    // torus adds radius + tube = 0.192 to whatever base it is given.
    const hoop = new THREE.TorusGeometry(0.17, 0.022, 8, 20, Math.PI)
    hoop.rotateY(Math.PI / 2)
    hoop.translate(-0.16, 0.9, sd * 0.3)
    parts.push(hoop)
  }

  return merge(parts)
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

  // 4 exhaust pipes
  for (const s of [1, -1]) {
    for (const offset of [0.4, 0.58]) {
      const exhaust = new THREE.CylinderGeometry(0.045, 0.045, 0.3, 16)
      exhaust.rotateZ(Math.PI / 2) // point backwards
      exhaust.translate(-2.15, 0.32, s * offset)
      parts.push(exhaust)
    }
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
 * undersized even when the package is right (this car is 6.39 wheel diameters
 * long, the same as a 720S; at the 0.40m radius it briefly carried it was 5.75,
 * which is Hot Wheels proportion and read as a toy).
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
    trimLoop(0.198, 0.412, () => c, intakeAperture, 0.009, 70)
  )
  return merge(sides)
}

/** The procedural "engineering block" (skateboard chassis, battery pack, motors). */
export function buildChassis() {
  const parts: THREE.BufferGeometry[] = []

  // Main battery floor tub
  const floor = new THREE.BoxGeometry(2.6, 0.08, 1.2)
  floor.translate(0, 0.15, 0)
  parts.push(floor)

  // Dense grid of battery modules (gives it that complex EV look)
  for (let x = -0.8; x <= 0.8; x += 0.2) {
    for (let z = -0.5; z <= 0.5; z += 0.12) {
      const cell = new THREE.BoxGeometry(0.18, 0.04, 0.1)
      cell.translate(x, 0.21, z)
      parts.push(cell)
    }
  }

  // Motor housings with cooling fins
  for (const mx of [1.3, -1.3]) {
    // Core motor
    const motor = new THREE.CylinderGeometry(0.15, 0.15, 0.5, 24)
    motor.rotateX(Math.PI / 2)
    motor.translate(mx, 0.3, 0)
    parts.push(motor)
    
    // Cooling fins
    for (let f = -0.2; f <= 0.2; f += 0.04) {
      const fin = new THREE.CylinderGeometry(0.17, 0.17, 0.01, 24)
      fin.rotateX(Math.PI / 2)
      fin.translate(mx, 0.3, f)
      parts.push(fin)
    }

    // Inverter box on top
    const inverter = new THREE.BoxGeometry(0.3, 0.15, 0.4)
    inverter.translate(mx, 0.45, 0)
    parts.push(inverter)
  }

  // Complex suspension linkages
  for (const s of [1, -1]) {
    // Side sills (carbon fiber tubs)
    const sill = new THREE.BoxGeometry(2.8, 0.1, 0.15)
    sill.translate(0, 0.2, s * 0.65)
    parts.push(sill)

    for (const a of AXLES) {
      // Driveshafts
      const shaft = new THREE.CylinderGeometry(0.015, 0.015, 0.6, 8)
      shaft.rotateX(Math.PI / 2)
      shaft.translate(a.x, 0.3, s * 0.3)
      parts.push(shaft)

      // Lower A-arms
      const arm1 = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8)
      arm1.rotateZ(Math.PI / 2)
      arm1.rotateY(s * 0.4)
      arm1.translate(a.x - 0.1, 0.25, s * 0.5)
      parts.push(arm1)

      const arm2 = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8)
      arm2.rotateZ(Math.PI / 2)
      arm2.rotateY(s * -0.4)
      arm2.translate(a.x + 0.1, 0.25, s * 0.5)
      parts.push(arm2)

      // Coil springs (approximated with ribbed rings)
      for (let r = 0; r < 10; r++) {
        const ring = new THREE.TorusGeometry(0.04, 0.01, 8, 16)
        ring.rotateX(Math.PI / 2)
        ring.rotateZ(-0.2)
        ring.translate(a.x, 0.35 + r * 0.03, s * 0.45)
        parts.push(ring)
      }
    }
  }

  // Cross bracing / Roll cage elements to fill the upper void
  for (const s of [1, -1]) {
    const brace = new THREE.CylinderGeometry(0.02, 0.02, 2.2, 8)
    brace.rotateZ(1.2)
    brace.translate(0, 0.5, s * 0.3)
    parts.push(brace)
    
    const brace2 = new THREE.CylinderGeometry(0.02, 0.02, 2.2, 8)
    brace2.rotateZ(-1.2)
    brace2.translate(0, 0.5, s * 0.3)
    parts.push(brace2)
  }

  return merge(parts)
}

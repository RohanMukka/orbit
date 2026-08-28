import * as THREE from 'three'
import { Profile, smoothstep } from './curve'

/**
 * ORBIT's body is a lofted surface: a stack of superelliptic cross-sections
 * swept along the car's length, with wheel arches carved analytically out of
 * the lower half. No mesh file, no sculpting — just four silhouette curves.
 */

export const CAR = {
  length: 4.72,
  frontAxle: 1.58,
  rearAxle: -1.5,
  wheelRadius: 0.36,
  wheelWidthFront: 0.27,
  wheelWidthRear: 0.33,
  trackFront: 0.82,
  trackRear: 0.85,
  archRadius: 0.46,
}

// u = 0 at the tail, u = 1 at the nose. x = (u - 0.5) * length
const halfWidth = new Profile([
  [0.0, 0.9], // Kamm tail face
  [0.05, 0.99],
  [0.13, 1.02],
  [0.22, 1.05], // rear haunches — widest point
  [0.32, 0.97],
  [0.44, 0.87], // coke-bottle waist, ahead of the intakes
  [0.56, 0.89],
  [0.68, 0.97],
  [0.78, 1.03], // front fenders
  [0.88, 0.94],
  [0.95, 0.8],
  [1.0, 0.58], // blunt nose, not a spike
])

const roof = new Profile([
  [0.0, 0.98], // Kamm tail
  [0.08, 1.04],
  [0.2, 1.07], // engine deck
  [0.34, 1.09],
  [0.46, 1.13],
  [0.56, 1.15], // roof peak — cab-forward
  [0.64, 1.13],
  [0.72, 1.04], // windshield header
  [0.8, 0.89], // cowl
  [0.88, 0.79],
  [0.95, 0.71],
  [1.0, 0.66], // nose
])

/**
 * How far the centre of the upper surface drops below the fender crowns.
 * One roofline can only give a pontoon body — this is what carves a bonnet
 * that sits between two wings, and a dished engine deck behind the cabin.
 */
const crown = new Profile([
  [0.0, 0.05],
  [0.14, 0.11], // dished engine deck
  [0.3, 0.05],
  [0.42, 0.0], // cabin: the roof is the high point
  [0.7, 0.0],
  [0.79, 0.12], // bonnet between the front wings
  [0.88, 0.11],
  [1.0, 0.06],
])

const floor = new Profile([
  [0.0, 0.44], // diffuser exit
  [0.05, 0.28],
  [0.14, 0.19],
  [0.5, 0.16], // flat floor
  [0.84, 0.18],
  [0.93, 0.22],
  [1.0, 0.3], // splitter lip
])

/** Height of the widest point, as a fraction of the section's height. */
const waist = new Profile([
  [0.0, 0.54],
  [0.2, 0.6],
  [0.5, 0.63],
  [0.78, 0.6],
  [1.0, 0.5],
])

// Section "boxiness": 2 = ellipse, higher = squarer shoulders.
const topExp = new Profile([
  [0.0, 3.4],
  [0.2, 3.2],
  [0.45, 3.0],
  [0.7, 2.9],
  [1.0, 3.2],
])
const botExp = new Profile([
  [0.0, 3.6],
  [0.5, 4.0],
  [1.0, 3.2],
])

const signPow = (v: number, e: number) => Math.sign(v) * Math.pow(Math.abs(v), e)

interface BodyPoint {
  x: number
  y: number
  z: number
}

function section(u: number, theta: number): BodyPoint {
  const x = (u - 0.5) * CAR.length
  const hw = halfWidth.at(u)
  const top = roof.at(u)
  const bot = floor.at(u)
  const yc = bot + (top - bot) * waist.at(u) // shoulder line
  const rt = top - yc
  const rb = yc - bot

  const c = Math.cos(theta)
  const s = Math.sin(theta)
  const e = s > 0 ? topExp.at(u) : botExp.at(u)
  const p = 2 / e

  let z = hw * signPow(c, p)
  let y = yc + (s > 0 ? rt : rb) * signPow(s, p)

  // --- crown ---------------------------------------------------------------
  const d = crown.at(u)
  if (d > 0 && y > yc) {
    const lateral = Math.min(1, Math.abs(z) / Math.max(1e-4, hw))
    const upness = Math.min(1, (y - yc) / Math.max(1e-4, rt))
    y -= d * upness * (1 - lateral * lateral)
  }

  // --- tumblehome ---------------------------------------------------------
  // Pull the glasshouse inboard above the shoulder line, hardest across the
  // cabin. Without this the roof and the flanks are one arc and the car
  // reads as a bar of soap.
  const cabin = smoothstep(0.26, 0.46, u) * (1 - smoothstep(0.72, 0.88, u))
  if (y > yc) {
    const k = smoothstep(0, 1, (y - yc) / Math.max(1e-4, top - yc))
    z *= 1 - (0.3 + 0.3 * cabin) * k * k
  } else {
    // …and tuck the lower body under, so the car sits on its shoulders.
    const k = (yc - y) / Math.max(1e-4, rb)
    z *= 1 - 0.24 * k * k
  }

  // --- side intake ---------------------------------------------------------
  // A scallop in the flank ahead of the rear wheel. Pressing the surface in
  // and painting it carbon reads as an intake without any extra geometry.
  const intake = smoothstep(0.2, 0.3, u) * (1 - smoothstep(0.46, 0.56, u))
  if (intake > 0) {
    const band = 1 - Math.min(1, Math.abs(y - (yc - rb * 0.16)) / (rb * 0.66))
    if (band > 0) z *= 1 - 0.16 * intake * smoothstep(0, 1, band)
  }

  // --- carve the wheel arches --------------------------------------------
  // Push the lower surface up onto a circle centred on each axle, blended in
  // by how far outboard the vertex sits, so the rocker panel stays low.
  for (const ax of [CAR.frontAxle, CAR.rearAxle]) {
    const dx = x - ax
    const t = Math.abs(dx) / CAR.archRadius
    if (t >= 1) continue
    const archY = CAR.wheelRadius + Math.sqrt(1 - t * t) * CAR.archRadius * 0.92
    if (archY <= y) continue
    // Fade the cut out towards the ends of the arch, so it flows into the
    // sill instead of leaving a step that reads as a bolt-on fender.
    const fade = smoothstep(1, 0.7, t)
    const outboard = smoothstep(0.38, 0.7, Math.abs(z))
    y += (archY - y) * outboard * fade
  }

  return { x, y, z }
}

export type Surface = 'paint' | 'glass' | 'carbon'

const TAU = Math.PI * 2
const wrap = (a: number) => {
  let v = a % TAU
  if (v > Math.PI) v -= TAU
  if (v < -Math.PI) v += TAU
  return v
}

/**
 * Materials are assigned in (u, theta) parameter space rather than in world
 * space. Classifying by world position gives a ragged, torn seam where the
 * threshold cuts across the triangle grid; classifying by parameter makes the
 * canopy and the underbody follow grid lines exactly, so the edges come out
 * clean without any extra geometry.
 */
/** Angular half-width of the canopy at a given station (0 = no glass). */
export function canopySpan(u: number): number {
  const cabin = smoothstep(0.4, 0.5, u) * (1 - smoothstep(0.68, 0.8, u))
  return cabin > 0.012 ? 1.12 * Math.pow(cabin, 0.55) : 0
}

/** Angular half-height of the side intake, and the angle it is centred on. */
export const INTAKE_CENTRE = -0.14
export function intakeAperture(u: number): number {
  const t = (u - 0.38) / 0.165
  return Math.abs(t) < 1 ? 0.15 * Math.pow(1 - t * t, 0.55) : 0
}

function surfaceAtParam(u: number, theta: number): Surface {
  if (u < 0.035 || u > 0.972) return 'carbon' // nose and tail fascias

  // Canopy: a band centred on the top of the section, tapering to a point at
  // the windscreen header and the base of the rear glass.
  const span = canopySpan(u)
  if (span > 0 && Math.abs(wrap(theta - Math.PI / 2)) < span) return 'glass'

  // Side intakes: a lens-shaped opening in the scalloped flank. A constant
  // width here would read as a rectangular sticker, so the aperture tapers to
  // a point at both ends of the scallop.
  const aperture = intakeAperture(u)
  if (aperture > 0) {
    const flank = Math.min(
      Math.abs(wrap(theta - INTAKE_CENTRE)),
      Math.abs(wrap(theta - Math.PI + INTAKE_CENTRE))
    )
    if (flank < aperture) return 'carbon'
  }

  // Underbody, sills and diffuser: a band centred on the bottom.
  const floorSpan = 1.0 + 0.25 * smoothstep(0.72, 1, u) + 0.2 * smoothstep(0.16, 0, u)
  if (Math.abs(wrap(theta + Math.PI / 2)) < floorSpan) return 'carbon'

  return 'paint'
}

export const BODY_RES = { stations: 264, ring: 152 }

/**
 * The angles sampled around one cross-section, as a table rather than an
 * expression. Uniform today — but character lines need specific columns to land
 * on specific angles, and those angles move along the car, so the ring has to
 * be addressable per station.
 */
function ringAngles(_u: number, ring: number): number[] {
  const out = new Array<number>(ring + 1)
  for (let j = 0; j <= ring; j++) out[j] = (j / ring) * Math.PI * 2
  return out
}

export function buildBodyGeometry(stations = BODY_RES.stations, ring = BODY_RES.ring): THREE.BufferGeometry {
  const cols = ring + 1 // duplicate seam column for clean normals
  const positions: number[] = []
  const grid: number[][] = []
  const angles: number[][] = []

  for (let i = 0; i < stations; i++) {
    const u = i / (stations - 1)
    const theta = ringAngles(u, ring)
    angles.push(theta)
    const row: number[] = []
    for (let j = 0; j < cols; j++) {
      const p = section(u, theta[j])
      row.push(positions.length / 3)
      positions.push(p.x, p.y, p.z)
    }
    grid.push(row)
  }

  // End caps: a fan to the section centroid at nose and tail.
  const capCentre = (u: number) => {
    const top = roof.at(u)
    const bot = floor.at(u)
    return [(u - 0.5) * CAR.length, (top + bot) * 0.5, 0]
  }
  const tailC = positions.length / 3
  positions.push(...capCentre(0))
  const noseC = positions.length / 3
  positions.push(...capCentre(1))

  const buckets: Record<Surface, number[]> = { paint: [], glass: [], carbon: [] }

  for (let i = 0; i < stations - 1; i++) {
    const u = (i + 0.5) / (stations - 1)
    for (let j = 0; j < ring; j++) {
      // Centre of the quad in angle space. Once the ring is warped this is no
      // longer the midpoint of the index range, so average the four corners.
      const theta = (angles[i][j] + angles[i][j + 1] + angles[i + 1][j] + angles[i + 1][j + 1]) * 0.25
      const bucket = buckets[surfaceAtParam(u, theta)]
      const a = grid[i][j]
      const b = grid[i + 1][j]
      const c = grid[i + 1][j + 1]
      const d = grid[i][j + 1]
      bucket.push(a, b, d, b, c, d)
    }
  }
  for (let j = 0; j < ring; j++) {
    buckets.carbon.push(tailC, grid[0][j + 1], grid[0][j])
    buckets.carbon.push(noseC, grid[stations - 1][j], grid[stations - 1][j + 1])
  }

  const order: Surface[] = ['paint', 'glass', 'carbon']
  const indices: number[] = []
  const geo = new THREE.BufferGeometry()
  order.forEach((key, materialIndex) => {
    const start = indices.length
    indices.push(...buckets[key])
    geo.addGroup(start, indices.length - start, materialIndex)
  })

  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  return geo
}

/** Point on the shell in parameter space — used to trace trim lines. */
export function bodyPoint(u: number, theta: number) {
  return section(u, theta)
}

export const profiles = { halfWidth, roof, floor, waist, crown }

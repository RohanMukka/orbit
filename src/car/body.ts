import * as THREE from 'three'
import { Profile, smoothstep, type Key } from './curve'
import { ROOF_HANDLES, WIDTH_HANDLES } from '../state'

/**
 * ORBIT's body is a lofted surface: a stack of superelliptic cross-sections
 * swept along the car's length, with wheel arches carved analytically out of
 * the lower half. No mesh file, no sculpting — just four silhouette curves.
 */

export const CAR = {
  length: 4.6, // Shortened slightly
  frontAxle: 1.5,
  rearAxle: -1.5,
  wheelRadius: 0.40, // Scaled up wheels
  wheelWidthFront: 0.28,
  wheelWidthRear: 0.35,
  trackFront: 0.82,
  trackRear: 0.85,
  archRadius: 0.50, // Scaled up wheel arches
}

// u = 0 at the tail, u = 1 at the nose. x = (u - 0.5) * length
export const HALF_WIDTH_KEYS: Key[] = [
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
  [0.95, 0.75],
  [1.0, 0.35], // tapered aggressive nose
]

export const ROOF_KEYS: Key[] = [
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
  [0.95, 0.65],
  [1.0, 0.48], // low aggressive nose
]

/**
 * How far the centre of the upper surface drops below the fender crowns.
 * One roofline can only give a pontoon body — this is what carves a bonnet
 * that sits between two wings, and a dished engine deck behind the cabin.
 */
export const CROWN_KEYS: Key[] = [
  [0.0, 0.05],
  [0.14, 0.11], // dished engine deck
  [0.3, 0.05],
  [0.42, 0.0], // cabin: the roof is the high point
  [0.7, 0.0],
  [0.79, 0.12], // bonnet between the front wings
  [0.88, 0.11],
  [1.0, 0.06],
]

export const FLOOR_KEYS: Key[] = [
  [0.0, 0.44], // diffuser exit
  [0.05, 0.28],
  [0.14, 0.19],
  [0.5, 0.16], // flat floor
  [0.84, 0.18],
  [0.93, 0.22],
  [1.0, 0.3], // splitter lip
]

/** Height of the widest point, as a fraction of the section's height. */
export const WAIST_KEYS: Key[] = [
  [0.0, 0.54],
  [0.2, 0.6],
  [0.5, 0.63],
  [0.78, 0.6],
  [1.0, 0.5],
]

// Section "boxiness": 2 = ellipse, higher = squarer shoulders.
export const TOP_EXP_KEYS: Key[] = [
  [0.0, 3.4],
  [0.2, 3.2],
  [0.45, 3.0],
  [0.7, 2.9],
  [1.0, 3.2],
]
export const BOT_EXP_KEYS: Key[] = [
  [0.0, 3.6],
  [0.5, 4.0],
  [1.0, 3.2],
]

/**
 * The curves, as a swappable set. They used to be module-level singletons,
 * which is fine while the car is fixed — but design mode reshapes them live, so
 * the loft has to be able to take a different set without reloading anything.
 */
export interface ProfileSet {
  halfWidth: Profile
  roof: Profile
  floor: Profile
  waist: Profile
  crown: Profile
  topExp: Profile
  botExp: Profile
}

export function makeProfiles(over: Partial<Record<keyof ProfileSet, Key[]>> = {}): ProfileSet {
  return {
    halfWidth: new Profile(over.halfWidth ?? HALF_WIDTH_KEYS),
    roof: new Profile(over.roof ?? ROOF_KEYS),
    floor: new Profile(over.floor ?? FLOOR_KEYS),
    waist: new Profile(over.waist ?? WAIST_KEYS),
    crown: new Profile(over.crown ?? CROWN_KEYS),
    topExp: new Profile(over.topExp ?? TOP_EXP_KEYS),
    botExp: new Profile(over.botExp ?? BOT_EXP_KEYS),
  }
}

export const BASE_PROFILES = makeProfiles()

const TAU = Math.PI * 2
const wrap = (a: number) => {
  let v = a % TAU
  if (v > Math.PI) v -= TAU
  if (v < -Math.PI) v += TAU
  return v
}

const signPow = (v: number, e: number) => Math.sign(v) * Math.pow(Math.abs(v), e)

/**
 * Character lines. Everything else on this body is a smooth blend, which is
 * exactly why it reads as extruded rather than designed — a car is large soft
 * surfaces meeting at a few deliberate hard breaks, and it was missing all of
 * the breaks.
 *
 * Each line is a ridge in parameter space: an angle that travels along the car
 * and an amplitude that fades in and out, drawn as a linear tent so the slope
 * flips sign at the peak. The tent is what makes a highlight snap instead of
 * sliding. Two lines only — a shoulder down the flank and a crown over the
 * front wing. A third starts to look busy.
 *
 * theta is measured from the widest point of the section, so the mirrored line
 * on the far side sits at PI - theta.
 */
interface Feature {
  theta: Profile
  amp: Profile
  width: number
}

const FEATURES: Feature[] = [
  {
    // Shoulder: sits just above the waist and runs the length of the car.
    theta: new Profile([
      [0.0, 0.3],
      [0.22, 0.34], // over the rear haunch
      [0.5, 0.4],
      [0.78, 0.36], // over the front fender
      [1.0, 0.3],
    ]),
    amp: new Profile([
      [0.0, 0.0],
      [0.07, 0.012],
      [0.3, 0.015],
      [0.7, 0.015],
      [0.92, 0.009],
      [1.0, 0.0],
    ]),
    width: 0.075,
  },
  {
    // Fender crown: only over the front wing, dying before the windscreen.
    theta: new Profile([
      [0.0, 0.95],
      [0.7, 0.95],
      [0.84, 1.02],
      [1.0, 1.05],
    ]),
    amp: new Profile([
      [0.0, 0.0],
      [0.68, 0.0],
      [0.79, 0.013],
      [0.9, 0.011],
      [0.98, 0.0],
      [1.0, 0.0],
    ]),
    width: 0.085,
  },
]

interface BodyPoint {
  x: number
  y: number
  z: number
}

function section(u: number, theta: number, P: ProfileSet = BASE_PROFILES): BodyPoint {
  const x = (u - 0.5) * CAR.length
  const hw = P.halfWidth.at(u)
  const top = P.roof.at(u)
  const bot = P.floor.at(u)
  const yc = bot + (top - bot) * P.waist.at(u) // shoulder line
  const rt = top - yc
  const rb = yc - bot

  const c = Math.cos(theta)
  const s = Math.sin(theta)
  const e = s > 0 ? P.topExp.at(u) : P.botExp.at(u)
  const p = 2 / e

  let z = hw * signPow(c, p)
  let y = yc + (s > 0 ? rt : rb) * signPow(s, p)

  // --- crown ---------------------------------------------------------------
  const d = P.crown.at(u)
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
    if (band > 0) z *= 1 - 0.45 * intake * smoothstep(0, 1, band)
  }

  // --- character lines -----------------------------------------------------
  // Push the surface out along a narrow tent centred on each line. The tent is
  // linear rather than smooth on purpose: its slope flips sign at the peak, and
  // that discontinuity is the whole point — it is what a crease is.
  for (const f of FEATURES) {
    const a = f.amp.at(u)
    if (a <= 0) continue
    const base = f.theta.at(u)
    for (const centre of [base, Math.PI - base]) {
      const d = Math.abs(wrap(theta - centre))
      if (d >= f.width) continue
      const push = a * (1 - d / f.width)
      // Outward in the section plane, measured from the shoulder line.
      const ny = y - yc
      const len = Math.hypot(z, ny) || 1
      z += (z / len) * push
      y += (ny / len) * push
    }
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
  const normTh = theta / TAU
  // Canopy (windshield and side windows)
  if (u > 0.36 && u < 0.8 && normTh > 0.18 && normTh < 0.32) return 'glass'
  // Diffuser, underbody, and entire rear fascia (Kamm tail)
  if (u < 0.04) return 'carbon'
  if (u < 0.15 && (normTh > 0.85 || normTh < 0.15)) return 'carbon'
  if (normTh > 0.9 || normTh < 0.1) return 'carbon'
  // Front splitter
  if (u > 0.95 && (normTh > 0.85 || normTh < 0.15)) return 'carbon'
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

interface Anchor {
  j: number
  theta: (u: number) => number
}

/**
 * Columns pinned to the character lines. The angle each one carries travels
 * along the car, but the column index it lives in must not: parameterise the
 * ring differently at each station and the surface kinks between them.
 */
function featureColumns(ring: number): Anchor[] {
  const all: Anchor[] = []
  for (const f of FEATURES) {
    const ref = f.theta.at(0.5)
    all.push({ j: Math.round((ref / TAU) * ring), theta: (u) => f.theta.at(u) })
    all.push({
      j: Math.round(((Math.PI - ref) / TAU) * ring),
      theta: (u) => Math.PI - f.theta.at(u),
    })
  }
  all.sort((a, b) => a.j - b.j)
  // A monotonic warp needs strictly increasing anchors, so drop any that
  // collide with their neighbour or land on the seam.
  const kept: Anchor[] = []
  for (const c of all) {
    if (c.j <= 0 || c.j >= ring) continue
    if (kept.length && c.j <= kept[kept.length - 1].j) continue
    kept.push(c)
  }
  return kept
}

/**
 * The angles sampled around one cross-section. A piecewise-linear warp of
 * column index onto angle, exact at every anchor — so a sample always lands on
 * the peak of a character line rather than straddling it.
 */
function ringAngles(u: number, ring: number, anchors: Anchor[]): number[] {
  const knots = [
    { j: 0, t: 0 },
    ...anchors.map((a) => ({ j: a.j, t: a.theta(u) })),
    { j: ring, t: TAU },
  ]
  const out = new Array<number>(ring + 1)
  let k = 0
  for (let j = 0; j <= ring; j++) {
    while (k < knots.length - 2 && j > knots[k + 1].j) k++
    const a = knots[k]
    const b = knots[k + 1]
    const f = b.j === a.j ? 0 : (j - a.j) / (b.j - a.j)
    out[j] = a.t + (b.t - a.t) * f
  }
  return out
}

export function buildBodyGeometry(
  stations = BODY_RES.stations,
  ring = BODY_RES.ring,
  P: ProfileSet = BASE_PROFILES
): THREE.BufferGeometry {
  const cols = ring + 1 // duplicate seam column for clean normals
  const positions: number[] = []
  // (u, theta) travels with the vertex so the shader can draw panel gaps from
  // the loft's own parameters instead of a texture.
  const uvs: number[] = []
  const angles: number[][] = []
  const anchors = featureColumns(ring)
  const isFeature = new Set(anchors.map((a) => a.j))

  /**
   * Two index grids rather than one. On a character line the column is emitted
   * twice at the same point: quads below it take `gridR`, quads above it take
   * `gridL`. The two copies are then referenced by faces from one side only, so
   * computeVertexNormals has nothing to average across and the crease survives
   * as a real shading break. It is the trick the seam column already uses,
   * applied along the car instead of around it.
   */
  const gridL: number[][] = []
  const gridR: number[][] = []

  for (let i = 0; i < stations; i++) {
    const u = i / (stations - 1)
    const theta = ringAngles(u, ring, anchors)
    angles.push(theta)
    const rowL: number[] = new Array(cols)
    const rowR: number[] = new Array(cols)
    for (let j = 0; j < cols; j++) {
      const p = section(u, theta[j], P)
      const idx = positions.length / 3
      positions.push(p.x, p.y, p.z)
      uvs.push(u, theta[j] / TAU)
      rowL[j] = idx
      if (isFeature.has(j)) {
        rowR[j] = positions.length / 3
        positions.push(p.x, p.y, p.z)
        uvs.push(u, theta[j] / TAU)
      } else {
        rowR[j] = idx
      }
    }
    gridL.push(rowL)
    gridR.push(rowR)
  }

  // End caps: a fan to the section centroid at nose and tail.
  // Dome the caps slightly. A flat fan at the nose catches almost no light and
  // reads as an open pipe rather than the end of a car.
  const capCentre = (u: number) => {
    const top = P.roof.at(u)
    const bot = P.floor.at(u)
    const push = (u < 0.5 ? -1 : 1) * 0.045
    return [(u - 0.5) * CAR.length + push, (top + bot) * 0.5, 0]
  }
  const tailC = positions.length / 3
  positions.push(...capCentre(0))
  uvs.push(0, 0)
  const noseC = positions.length / 3
  positions.push(...capCentre(1))
  uvs.push(1, 0)

  const buckets: Record<Surface, number[]> = { paint: [], glass: [], carbon: [] }

  for (let i = 0; i < stations - 1; i++) {
    const u = (i + 0.5) / (stations - 1)
    for (let j = 0; j < ring; j++) {
      // Centre of the quad in angle space. Once the ring is warped this is no
      // longer the midpoint of the index range, so average the four corners.
      const theta = (angles[i][j] + angles[i][j + 1] + angles[i + 1][j] + angles[i + 1][j + 1]) * 0.25
      const bucket = buckets[surfaceAtParam(u, theta)]
      const a = gridR[i][j]
      const b = gridR[i + 1][j]
      const c = gridL[i + 1][j + 1]
      const d = gridL[i][j + 1]
      bucket.push(a, b, d, b, c, d)
    }
  }
  for (let j = 0; j < ring; j++) {
    buckets.paint.push(tailC, gridR[0][j], gridL[0][j + 1])
    buckets.paint.push(noseC, gridL[stations - 1][j + 1], gridR[stations - 1][j])
  }

  const order: Surface[] = ['paint', 'glass', 'carbon']
  const indices: number[] = []
  const geo = new THREE.BufferGeometry()
  order.forEach((key, materialIndex) => {
    const start = indices.length
    for (let i = 0; i < buckets[key].length; i++) {
      indices.push(buckets[key][i])
    }
    geo.addGroup(start, indices.length - start, materialIndex)
  })

  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  return geo
}

/**
 * Rewrites the shell's vertices for a new set of curves, in place.
 *
 * Topology — the index buffer, the material groups, the split columns — depends
 * only on the feature lines and the resolution, and neither of those moves when
 * a curve is dragged. So a drag only has to touch positions and normals, which
 * is what makes reshaping the car interactive rather than a rebuild.
 *
 * Must emit vertices in exactly the order buildBodyGeometry does.
 */
export function updateBodyPositions(
  geo: THREE.BufferGeometry,
  P: ProfileSet,
  stations = BODY_RES.stations,
  ring = BODY_RES.ring
) {
  const attr = geo.getAttribute('position') as THREE.BufferAttribute
  const out = attr.array as Float32Array
  const cols = ring + 1
  const anchors = featureColumns(ring)
  const isFeature = new Set(anchors.map((a) => a.j))
  let w = 0

  for (let i = 0; i < stations; i++) {
    const u = i / (stations - 1)
    const theta = ringAngles(u, ring, anchors)
    for (let j = 0; j < cols; j++) {
      const p = section(u, theta[j], P)
      out[w++] = p.x
      out[w++] = p.y
      out[w++] = p.z
      if (isFeature.has(j)) {
        out[w++] = p.x
        out[w++] = p.y
        out[w++] = p.z
      }
    }
  }
  for (const u of [0, 1]) {
    const top = P.roof.at(u)
    const bot = P.floor.at(u)
    const push = (u < 0.5 ? -1 : 1) * 0.045
    out[w++] = (u - 0.5) * CAR.length + push
    out[w++] = (top + bot) * 0.5
    out[w++] = 0
  }

  attr.needsUpdate = true
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
}

/**
 * The curves as reshaped by design mode.
 *
 * A handle does not move its own key alone — it drags its neighbours with it,
 * falling off over roughly a fifth of the car. Moving a single key leaves a
 * local blister on an otherwise smooth roofline, which reads as damage rather
 * than as design; proportional falloff is what makes every reachable shape look
 * like somebody meant it.
 */
const FALLOFF = 0.2

function reshape(keys: Key[], handles: number[], offsets: number[]): Key[] {
  return keys.map(([u, v]) => {
    let d = 0
    handles.forEach((idx, n) => {
      const amount = offsets[n] ?? 0
      if (!amount) return
      const t = Math.abs(u - keys[idx][0]) / FALLOFF
      if (t >= 1) return
      d += amount * smoothstep(0, 1, 1 - t)
    })
    return [u, v + d] as Key
  })
}

export function shapedProfiles(shape: { roof: number[]; width: number[] }): ProfileSet {
  return {
    ...makeProfiles({
      roof: reshape(ROOF_KEYS, ROOF_HANDLES, shape.roof),
      halfWidth: reshape(HALF_WIDTH_KEYS, WIDTH_HANDLES, shape.width),
    }),
  }
}

/** Point on the shell in parameter space — used to trace trim lines. */
export function bodyPoint(u: number, theta: number, P: ProfileSet = BASE_PROFILES) {
  return section(u, theta, P)
}

export const profiles = BASE_PROFILES

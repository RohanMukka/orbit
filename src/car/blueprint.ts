import * as THREE from 'three'
import { CAR, bodyPoint, profiles } from './body'

/**
 * The blueprint chapter's job is to prove the headline: four curves make a car.
 * Drawing the shell as a triangulated wireframe argued the opposite — a judge
 * reads a mesh of triangles as "a model in wireframe mode", which is precisely
 * the impression the project exists to refute.
 *
 * So draw what the code actually contains: the profile curves themselves, and
 * the sections swept along them.
 */

const X = (u: number) => (u - 0.5) * CAR.length

/** Height of the widest point at a station — the waist curve resolved. */
function waistY(u: number) {
  const top = profiles.roof.at(u)
  const bot = profiles.floor.at(u)
  return bot + (top - bot) * profiles.waist.at(u)
}

function segments(runs: THREE.Vector3[][]): THREE.BufferGeometry {
  const arr: number[] = []
  for (const pts of runs) {
    for (let i = 0; i < pts.length - 1; i++) {
      arr.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
  g.computeBoundingSphere()
  return g
}

/**
 * The four curves, in the plane each one actually governs: roofline and floor
 * on the centreline, half-width as the plan-view outline, and the waist as the
 * line the two halves of every section are hinged about.
 */
export function buildProfileCurves(samples = 200): THREE.BufferGeometry {
  const roof: THREE.Vector3[] = []
  const floor: THREE.Vector3[] = []
  const widthA: THREE.Vector3[] = []
  const widthB: THREE.Vector3[] = []
  const waist: THREE.Vector3[] = []

  for (let i = 0; i <= samples; i++) {
    const u = i / samples
    const x = X(u)
    const yc = waistY(u)
    const hw = profiles.halfWidth.at(u)
    roof.push(new THREE.Vector3(x, profiles.roof.at(u), 0))
    floor.push(new THREE.Vector3(x, profiles.floor.at(u), 0))
    widthA.push(new THREE.Vector3(x, yc, hw))
    widthB.push(new THREE.Vector3(x, yc, -hw))
    waist.push(new THREE.Vector3(x, yc, 0))
  }
  return segments([roof, floor, widthA, widthB, waist])
}

/** Cross-sections swept along those curves — the loft, shown as a loft. */
export function buildSectionRings(count = 30, ring = 84): THREE.BufferGeometry {
  const runs: THREE.Vector3[][] = []
  for (let s = 0; s < count; s++) {
    const u = s / (count - 1)
    const loop: THREE.Vector3[] = []
    for (let j = 0; j <= ring; j++) {
      const p = bodyPoint(u, (j / ring) * Math.PI * 2)
      loop.push(new THREE.Vector3(p.x, p.y, p.z))
    }
    runs.push(loop)
  }
  return segments(runs)
}

/** Station ticks along the ground, so the sweep reads as measured, not drawn. */
export function buildGroundRule(count = 30): THREE.BufferGeometry {
  const runs: THREE.Vector3[][] = []
  const z = 1.35
  runs.push([new THREE.Vector3(X(0), 0.002, z), new THREE.Vector3(X(1), 0.002, z)])
  for (let s = 0; s < count; s++) {
    const x = X(s / (count - 1))
    runs.push([new THREE.Vector3(x, 0.002, z), new THREE.Vector3(x, 0.002, z + 0.075)])
  }
  return segments(runs)
}

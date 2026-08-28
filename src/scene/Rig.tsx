import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { peek } from '../state'

export interface Shot {
  pos: [number, number, number]
  target: [number, number, number]
  fov: number
  /**
   * Lateral dolly, in metres. Camera and target both slide along the view's
   * right vector, which translates the frame instead of rotating it — so the
   * car moves across the screen and leaves the chapter's copy a clear side to
   * sit on. Positive pushes the car left.
   */
  offset: number
}

export const SHOTS: Shot[] = [
  { pos: [5.5, 1.52, 5.1], target: [0, 0.68, 0], fov: 34, offset: -0.85 },
  { pos: [0.5, 0.95, 10.4], target: [0, 0.66, 0], fov: 26, offset: 1.15 },
  { pos: [6.5, 0.58, 2.3], target: [0.4, 0.62, 0], fov: 38, offset: -0.8 },
  { pos: [-4.9, 1.3, 5.3], target: [0, 0.7, 0], fov: 33, offset: 0.8 },
  { pos: [-6.5, 0.82, -3.1], target: [-0.2, 0.68, 0], fov: 40, offset: -0.55 },
]

const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)

/**
 * The page is one section per chapter plus the outro, so chapter i is centred
 * in the viewport at progress i / (sections - 1) — not i / (chapters - 1).
 * Getting this wrong slides every chapter's copy out of frame.
 */
export const SECTIONS = SHOTS.length + 1
export const chapterFloat = (progress: number) =>
  Math.min(SHOTS.length - 1, Math.max(0, progress * (SECTIONS - 1)))

const nextPos = new THREE.Vector3()
const nextTarget = new THREE.Vector3()
const scratch = new THREE.Vector3()
const forward = new THREE.Vector3()
const right = new THREE.Vector3()
const UP = new THREE.Vector3(0, 1, 0)

/** ?cam=px,py,pz,tx,ty,tz pins the camera — used for design review shots. */
const camOverride = (() => {
  const raw = new URLSearchParams(location.search).get('cam')
  if (!raw) return null
  const n = raw.split(',').map(Number)
  if (n.length < 6 || n.some(Number.isNaN)) return null
  return { pos: new THREE.Vector3(n[0], n[1], n[2]), target: new THREE.Vector3(n[3], n[4], n[5]), fov: n[6] ?? 32 }
})()

export function Rig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const target = useRef(new THREE.Vector3(0, 0.68, 0))
  const pointer = useRef(new THREE.Vector2())

  useFrame((state, dt) => {
    if (camOverride) {
      camera.position.copy(camOverride.pos)
      camera.lookAt(camOverride.target)
      if (camera.fov !== camOverride.fov) {
        camera.fov = camOverride.fov
        camera.updateProjectionMatrix()
      }
      return
    }
    const s = peek()
    const p = chapterFloat(s.progress)
    const i = Math.min(SHOTS.length - 2, Math.floor(p))
    const t = smootherstep(Math.min(1, Math.max(0, p - i)))
    const a = SHOTS[i]
    const b = SHOTS[i + 1]

    nextPos.fromArray(a.pos).lerp(scratch.fromArray(b.pos), t)
    nextTarget.fromArray(a.target).lerp(scratch.fromArray(b.target), t)

    // Portrait viewports see far less width for the same vertical fov, so
    // dolly back to fit the car rather than widening the lens into a fisheye.
    const aspect = state.size.width / Math.max(1, state.size.height)
    const portrait = aspect < 1.05
    const fit = THREE.MathUtils.clamp(1.35 / aspect, 1, 1.8)
    nextPos.sub(nextTarget).multiplyScalar(fit).add(nextTarget)

    // Slide the whole frame sideways so the car clears the chapter's copy.
    // On mobile the copy sits above the car instead, so the frame drops
    // rather than slides.
    const offset = THREE.MathUtils.lerp(a.offset, b.offset, t) * (portrait ? 0.2 : 1)
    forward.subVectors(nextTarget, nextPos).normalize()
    right.crossVectors(forward, UP).normalize().multiplyScalar(offset)
    nextPos.add(right)
    nextTarget.add(right)
    if (portrait) {
      nextPos.y += 0.78
      nextTarget.y += 0.78
    }

    // gentle idle drift, plus pointer parallax
    const time = state.clock.elapsedTime
    pointer.current.lerp(state.pointer, 1 - Math.pow(0.001, dt))
    const swing = s.entered ? 1 : 0.35
    nextPos.x += Math.sin(time * 0.19) * 0.22 * swing + pointer.current.x * 0.75
    nextPos.y += Math.cos(time * 0.16) * 0.08 * swing - pointer.current.y * 0.35
    nextPos.z += Math.cos(time * 0.13) * 0.22 * swing

    camera.position.lerp(nextPos, 1 - Math.pow(0.0015, dt))
    target.current.lerp(nextTarget, 1 - Math.pow(0.002, dt))
    camera.lookAt(target.current)

    const fov = THREE.MathUtils.lerp(a.fov, b.fov, t)
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = THREE.MathUtils.damp(camera.fov, fov, 2.5, dt)
      camera.updateProjectionMatrix()
    }
  })

  return null
}

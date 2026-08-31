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
  // Design: near-profile, so a dragged roofline is legible as it moves.
  { pos: [0.9, 1.0, 8.9], target: [0, 0.6, 0], fov: 29, offset: -0.8 },
  // Macro shot: looking tightly at the rear quarter panel and procedural gap
  { pos: [-1.2, 0.8, 1.5], target: [-0.4, 0.65, 0.9], fov: 15, offset: 0.35 },
  { pos: [-6.5, 0.82, -3.1], target: [-0.2, 0.68, 0], fov: 40, offset: -0.55 },
]

const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)

// Half-extents of the car, plus a little air so it never touches the edge.
const HALF_LENGTH = 2.42
const HALF_WIDTH = 1.12
// Wide enough to also swallow the idle drift, which is +/- 0.22 in world x.
const EDGE_MARGIN = 0.58

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
  const bank = useRef(0)

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

    const aspect = state.size.width / Math.max(1, state.size.height)
    const portrait = aspect < 1.05
    let fov = THREE.MathUtils.lerp(a.fov, b.fov, t) + (s.photoMode ? 0 : Math.sin(state.clock.elapsedTime * 1.5) * 0.5)
    fov += Math.abs(s.scrollVelocity || 0) * 0.05

    // Slide the whole frame sideways so the car clears the chapter's copy.
    // On mobile the copy sits above the car instead, so the frame drops
    // rather than slides.
    let offset = THREE.MathUtils.lerp(a.offset, b.offset, t) * (portrait ? 0.2 : 1)
    forward.subVectors(nextTarget, nextPos).normalize()
    right.crossVectors(forward, UP).normalize()

    /**
     * Fit the shot rather than trusting it. How much width the car eats depends
     * on the angle it is seen from, and the frame then slides sideways to clear
     * the copy — so a shot that composes at one aspect ratio walks off the edge
     * at another. Project the car's extent onto the camera's right vector, add
     * the slide, and solve for the distance where both still land inside the
     * frustum. Never dolly closer than the shot asked for.
     */
    // Portrait has far less width to give away, so it gets a tighter margin —
    // the car is small enough there already.
    if (s.exploded) {
      fov = 42
      const time = state.clock.elapsedTime
      nextPos.set(Math.cos(time * 0.2) * 7.5, 2.4 + Math.sin(time * 0.1) * 0.5, Math.sin(time * 0.2) * 7.5)
      nextTarget.set(0, 0.6, 0)
      offset = 0
    } else if (s.photoMode) {
      const time = state.clock.elapsedTime * 0.1
      const dist2 = nextPos.distanceTo(nextTarget)
      nextPos.x = nextTarget.x + Math.sin(time) * dist2
      nextPos.z = nextTarget.z + Math.cos(time) * dist2
      offset = 0
    }

    forward.subVectors(nextTarget, nextPos).normalize()
    right.crossVectors(forward, UP).normalize()

    // Pulling away for the full car.
    const reach =
      Math.abs(right.x) * HALF_LENGTH +
      Math.abs(right.z) * HALF_WIDTH +
      (portrait ? EDGE_MARGIN * 0.4 : EDGE_MARGIN)
    const halfSpan = Math.tan(THREE.MathUtils.degToRad(fov) * 0.5) * aspect
    const need = (reach + Math.abs(offset)) / Math.max(0.05, halfSpan)
    const dist = nextPos.distanceTo(nextTarget)
    const fit = Math.min(3, Math.max(1, need / Math.max(0.001, dist)))
    nextPos.sub(nextTarget).multiplyScalar(fit).add(nextTarget)

    scratch.copy(right).multiplyScalar(offset)
    nextPos.add(scratch)
    nextTarget.add(scratch)
    if (portrait) {
      nextPos.y += 0.78
      nextTarget.y += 0.78
    }

    // Elegant cinematic camera target breathing & physical dive
    const time = state.clock.elapsedTime
    nextTarget.y += Math.sin(time * 0.5) * 0.05 + (s.scrollVelocity || 0) * 0.002
    pointer.current.lerp(state.pointer, 1 - Math.pow(0.001, dt))
    const swing = s.entered ? 1 : 0.35
    nextPos.x += Math.sin(time * 0.19) * 0.22 * swing + pointer.current.x * 2.5
    nextPos.y += Math.cos(time * 0.16) * 0.08 * swing - pointer.current.y * 0.35
    nextPos.z += Math.cos(time * 0.13) * 0.22 * swing + (s.scrollVelocity || 0) * 0.03
    
    // Physical camera target lag & apex tracking
    nextTarget.x += (s.scrollVelocity || 0) * 0.0005 + pointer.current.x * -1.5
    nextTarget.z += (s.scrollVelocity || 0) * -0.005

    // Directional G-Force: Accelerate (positive) expands FOV, Brake (negative) compresses FOV
    fov += (s.scrollVelocity || 0) * 0.1
    fov = Math.max(10, Math.min(150, fov))

    if (s.launching) {
      const surge = Math.sin(time * 15.0) * 2.0
      const targetFov = 95 + (camera.userData.lt || 0) * 15.0 + surge
      fov = THREE.MathUtils.damp(fov, Math.min(130, targetFov), 3, dt)
    }

    if (s.launching || s.glitch) {
      // Smooth high-frequency camera shake for elegant visceral vibration
      const shakeAmt = (s.launching ? 0.05 : 0.02) + Math.abs(s.scrollVelocity || 0) * 0.001
      nextPos.x += Math.sin(time * 80) * shakeAmt
      nextPos.y += Math.cos(time * 90) * shakeAmt
      nextPos.z += Math.sin(time * 75) * shakeAmt
    }

    if (s.launching) {
      // Rig-specific launch timer attached to camera rather than target, or just a state block var.
      // We can use camera.userData safely since camera is an Object3D.
      camera.userData.lt = (camera.userData.lt || 0) + dt
      const rigLT = camera.userData.lt
      if (rigLT > 1.0) {
        const drive = Math.pow(rigLT - 1.0, 3) * 60.0
        nextPos.x += drive
        nextTarget.x += drive
      }
    } else {
      camera.userData.lt = 0
    }

    camera.position.lerp(nextPos, 1 - Math.pow(0.0015, dt))
    target.current.lerp(nextTarget, 1 - Math.pow(0.002, dt))

    const steerBank = state.pointer.x * -0.1
    const targetBank = ((s.scrollVelocity || 0) * -0.002) + steerBank
    bank.current = THREE.MathUtils.damp(bank.current, targetBank, 3, dt)
    camera.up.set(Math.sin(bank.current), Math.cos(bank.current), 0).normalize()

    camera.lookAt(target.current)
    camera.rotateX((s.scrollVelocity || 0) * -0.001)

    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = THREE.MathUtils.damp(camera.fov, fov, 2.5, dt)
      camera.updateProjectionMatrix()
    }
  })

  return null
}

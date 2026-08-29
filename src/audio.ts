/**
 * Every sound here is generated at runtime — oscillators, filters, and a noise
 * buffer written sample by sample. A sample library would be the only
 * downloaded asset on a site whose whole claim is that it downloads none, so
 * the constraint that shaped the geometry shapes the audio too.
 *
 * Nothing ever autoplays. The context is created from a click and no earlier;
 * browsers would block it anyway, but a silent page that stays silent until
 * asked is the right default regardless.
 */

let ctx: AudioContext | null = null
let master: GainNode
let droneCutoff: BiquadFilterNode
let droneLevel: GainNode
let rushLevel: GainNode

export const isOn = () => !!ctx

/** Two-second loop of brown noise, generated rather than fetched. */
function brownNoise(c: AudioContext): AudioBuffer {
  const len = c.sampleRate * 2
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    d[i] = last * 3.5
  }
  return buf
}

export async function enable() {
  if (ctx) return
  const AC: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return
  const c = new AC()
  ctx = c
  try {
    await c.resume()
  } catch {
    /* a blocked resume just leaves it quiet */
  }

  master = c.createGain()
  master.gain.value = 0
  master.connect(c.destination)

  // Drone: two saws a third of a hertz apart, so they beat slowly against each
  // other instead of sitting still.
  droneCutoff = c.createBiquadFilter()
  droneCutoff.type = 'lowpass'
  droneCutoff.frequency.value = 180
  droneCutoff.Q.value = 0.8
  droneLevel = c.createGain()
  droneLevel.gain.value = 0.22
  droneCutoff.connect(droneLevel).connect(master)
  for (const f of [55, 55.3]) {
    const o = c.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = f
    o.connect(droneCutoff)
    o.start()
  }

  // Road rush for the night chapter.
  const src = c.createBufferSource()
  src.buffer = brownNoise(c)
  src.loop = true
  const band = c.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = 700
  band.Q.value = 0.6
  rushLevel = c.createGain()
  rushLevel.gain.value = 0
  src.connect(band).connect(rushLevel).connect(master)
  src.start()

  master.gain.linearRampToValueAtTime(0.5, c.currentTime + 1.2)
}

export function disable() {
  if (!ctx) return
  const c = ctx
  ctx = null
  master.gain.linearRampToValueAtTime(0, c.currentTime + 0.35)
  window.setTimeout(() => void c.close(), 500)
}

/** The drone opens up as the studio lights die and the car goes outside. */
export function setScroll(p: number) {
  if (!ctx) return
  droneCutoff.frequency.setTargetAtTime(180 + p * p * 1020, ctx.currentTime, 0.4)
}

export function setNight(on: boolean) {
  if (!ctx) return
  const t = ctx.currentTime
  rushLevel.gain.setTargetAtTime(on ? 0.17 : 0, t, 0.7)
  // duck the drone ~3 dB under the headlights
  droneLevel.gain.setTargetAtTime(on ? 0.155 : 0.22, t, 0.7)
}

/** Swatch change: a short sine blip plus a noise tick, so it reads as a detent. */
export function blip() {
  if (!ctx) return
  const c = ctx
  const t = c.currentTime
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.value = 2100
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.15, t + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + 0.05)

  const tick = c.createBufferSource()
  tick.buffer = brownNoise(c)
  const shelf = c.createBiquadFilter()
  shelf.type = 'highshelf'
  shelf.frequency.value = 3000
  shelf.gain.value = 8
  const tg = c.createGain()
  tg.gain.setValueAtTime(0.09, t)
  tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.012)
  tick.connect(shelf).connect(tg).connect(master)
  tick.start(t)
  tick.stop(t + 0.02)
}

/** Surface mode: a bandpass sweep across noise — a shutter, not a beep. */
export function sweep() {
  if (!ctx) return
  const c = ctx
  const t = c.currentTime
  const src = c.createBufferSource()
  src.buffer = brownNoise(c)
  const band = c.createBiquadFilter()
  band.type = 'bandpass'
  band.Q.value = 3
  band.frequency.setValueAtTime(400, t)
  band.frequency.exponentialRampToValueAtTime(3000, t + 0.26)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.04)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28)
  src.connect(band).connect(g).connect(master)
  src.start(t)
  src.stop(t + 0.3)
}

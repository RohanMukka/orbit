/**
 * Monotone cubic Hermite interpolation (Fritsch–Carlson).
 * Used to sample the car's silhouette curves without the overshoot a plain
 * Catmull-Rom would give us — overshoot on a roofline reads instantly as "wrong".
 */
export type Key = [u: number, value: number]

export class Profile {
  private xs: number[]
  private ys: number[]
  private ms: number[]

  constructor(keys: Key[]) {
    const sorted = [...keys].sort((a, b) => a[0] - b[0])
    this.xs = sorted.map((k) => k[0])
    this.ys = sorted.map((k) => k[1])

    const n = this.xs.length
    const dx: number[] = []
    const slope: number[] = []
    for (let i = 0; i < n - 1; i++) {
      dx.push(this.xs[i + 1] - this.xs[i])
      slope.push((this.ys[i + 1] - this.ys[i]) / (this.xs[i + 1] - this.xs[i]))
    }

    const m: number[] = new Array(n)
    m[0] = slope[0]
    m[n - 1] = slope[n - 2]
    for (let i = 1; i < n - 1; i++) {
      if (slope[i - 1] * slope[i] <= 0) m[i] = 0
      else {
        const w1 = 2 * dx[i] + dx[i - 1]
        const w2 = dx[i] + 2 * dx[i - 1]
        m[i] = (w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i])
      }
    }
    this.ms = m
  }

  at(u: number): number {
    const { xs, ys, ms } = this
    const n = xs.length
    if (u <= xs[0]) return ys[0]
    if (u >= xs[n - 1]) return ys[n - 1]

    let lo = 0
    let hi = n - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (xs[mid] <= u) lo = mid
      else hi = mid
    }

    const h = xs[hi] - xs[lo]
    const t = (u - xs[lo]) / h
    const t2 = t * t
    const t3 = t2 * t
    return (
      ys[lo] * (2 * t3 - 3 * t2 + 1) +
      ms[lo] * h * (t3 - 2 * t2 + t) +
      ys[hi] * (-2 * t3 + 3 * t2) +
      ms[hi] * h * (t3 - t2)
    )
  }
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

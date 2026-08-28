import { useRef } from 'react'
import {
  FLAT_SHAPE,
  ROOF_HANDLES,
  ROOF_RANGE,
  WIDTH_HANDLES,
  WIDTH_RANGE,
  set,
  useStore,
  peek,
} from '../state'
import { HALF_WIDTH_KEYS, ROOF_KEYS, shapedProfiles } from '../car/body'

/**
 * Design mode. Drag the silhouette curves and the body is re-lofted underneath
 * them — the claim the whole site makes, handed to the visitor to check.
 *
 * Deliberately not free-form dragging in the 3D view: every handle is clamped
 * to a range where the result still reads as a car, because a judge who makes
 * the hero object ugly has just watched it break.
 */

const SIDE = { w: 300, h: 120, top: 1.32, bottom: 0.08, x0: 12, x1: 288 }
const PLAN = { w: 300, h: 100, mid: 50, span: 40, max: 1.16, x0: 12, x1: 288 }

const sideX = (u: number) => SIDE.x0 + u * (SIDE.x1 - SIDE.x0)
const sideY = (v: number) =>
  SIDE.h - 12 - ((v - SIDE.bottom) / (SIDE.top - SIDE.bottom)) * (SIDE.h - 24)
const planX = (u: number) => PLAN.x0 + u * (PLAN.x1 - PLAN.x0)
const planY = (hw: number, s: number) => PLAN.mid - (s * hw * PLAN.span) / PLAN.max

const SAMPLES = 90

function path(pts: [number, number][]) {
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
}

const clamp = (v: number, r: number) => Math.min(r, Math.max(-r, v))

export function DesignPanel() {
  const shape = useStore((s) => s.shape)
  const sideRef = useRef<SVGSVGElement>(null)
  const planRef = useRef<SVGSVGElement>(null)

  const P = shapedProfiles(shape)

  const roofPts: [number, number][] = []
  const floorPts: [number, number][] = []
  const planTop: [number, number][] = []
  const planBottom: [number, number][] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const u = i / SAMPLES
    roofPts.push([sideX(u), sideY(P.roof.at(u))])
    floorPts.push([sideX(u), sideY(P.floor.at(u))])
    planTop.push([planX(u), planY(P.halfWidth.at(u), 1)])
    planBottom.push([planX(u), planY(P.halfWidth.at(u), -1)])
  }

  /** Convert a pointer drag into curve units and clamp it. */
  function startDrag(
    e: React.PointerEvent,
    svg: SVGSVGElement | null,
    kind: 'roof' | 'width',
    n: number
  ) {
    if (!svg) return
    e.preventDefault()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    const rect = svg.getBoundingClientRect()
    const startY = e.clientY
    const base = peek().shape
    const from = kind === 'roof' ? base.roof[n] : base.width[n]
    // px -> viewBox units -> curve units
    const perPx =
      kind === 'roof'
        ? ((SIDE.top - SIDE.bottom) / (SIDE.h - 24)) * (SIDE.h / Math.max(1, rect.height))
        : (PLAN.max / PLAN.span) * (PLAN.h / Math.max(1, rect.height))

    const move = (ev: PointerEvent) => {
      const delta = (startY - ev.clientY) * perPx
      const cur = peek().shape
      const range = kind === 'roof' ? ROOF_RANGE : WIDTH_RANGE
      const next = { roof: [...cur.roof], width: [...cur.width] }
      if (kind === 'roof') next.roof[n] = clamp(from + delta, range)
      else next.width[n] = clamp(from + delta, range)
      set({ shape: next })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      set({ dragging: false })
    }
    set({ dragging: true })
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const touched = shape.roof.some((v) => v !== 0) || shape.width.some((v) => v !== 0)

  return (
    <div className="design">
      <div className="panel__head">
        <span className="micro">Design</span>
        <button
          className="micro micro--dim design__reset"
          onClick={() => set({ shape: FLAT_SHAPE })}
          disabled={!touched}
        >
          Reset
        </button>
      </div>

      <span className="micro micro--dim design__hint">Drag a point — the body is re-lofted live</span>

      <svg
        ref={sideRef}
        className="design__plot"
        viewBox={`0 0 ${SIDE.w} ${SIDE.h}`}
        role="group"
        aria-label="Roofline and floor, side elevation"
      >
        <path className="design__fill" d={`${path(roofPts)} ${path([...floorPts].reverse()).replace('M', 'L')} Z`} />
        <path className="design__curve design__curve--dim" d={path(floorPts)} />
        <path className="design__curve" d={path(roofPts)} />
        {ROOF_HANDLES.map((idx, n) => {
          const u = ROOF_KEYS[idx][0]
          const v = P.roof.at(u)
          return (
            <circle
              key={idx}
              className="design__handle"
              cx={sideX(u)}
              cy={sideY(v)}
              r={6}
              tabIndex={0}
              role="slider"
              aria-label={`Roofline at ${Math.round(u * 100)}% along the car`}
              aria-valuenow={Math.round(shape.roof[n] * 100)}
              aria-valuemin={Math.round(-ROOF_RANGE * 100)}
              aria-valuemax={Math.round(ROOF_RANGE * 100)}
              onPointerDown={(e) => startDrag(e, sideRef.current, 'roof', n)}
              onKeyDown={(e) => {
                const step = e.key === 'ArrowUp' ? 0.01 : e.key === 'ArrowDown' ? -0.01 : 0
                if (!step) return
                e.preventDefault()
                const next = { roof: [...shape.roof], width: [...shape.width] }
                next.roof[n] = clamp(next.roof[n] + step, ROOF_RANGE)
                set({ shape: next })
              }}
            />
          )
        })}
      </svg>

      <svg
        ref={planRef}
        className="design__plot"
        viewBox={`0 0 ${PLAN.w} ${PLAN.h}`}
        role="group"
        aria-label="Half-width, plan view"
      >
        <path className="design__fill" d={`${path(planTop)} ${path([...planBottom].reverse()).replace('M', 'L')} Z`} />
        <path className="design__curve design__curve--dim" d={path(planBottom)} />
        <path className="design__curve" d={path(planTop)} />
        {WIDTH_HANDLES.map((idx, n) => {
          const u = HALF_WIDTH_KEYS[idx][0]
          const hw = P.halfWidth.at(u)
          return (
            <circle
              key={idx}
              className="design__handle"
              cx={planX(u)}
              cy={planY(hw, 1)}
              r={6}
              tabIndex={0}
              role="slider"
              aria-label={`Half-width at ${Math.round(u * 100)}% along the car`}
              aria-valuenow={Math.round(shape.width[n] * 100)}
              aria-valuemin={Math.round(-WIDTH_RANGE * 100)}
              aria-valuemax={Math.round(WIDTH_RANGE * 100)}
              onPointerDown={(e) => startDrag(e, planRef.current, 'width', n)}
              onKeyDown={(e) => {
                const step = e.key === 'ArrowUp' ? 0.01 : e.key === 'ArrowDown' ? -0.01 : 0
                if (!step) return
                e.preventDefault()
                const next = { roof: [...shape.roof], width: [...shape.width] }
                next.width[n] = clamp(next.width[n] + step, WIDTH_RANGE)
                set({ shape: next })
              }}
            />
          )
        })}
      </svg>
    </div>
  )
}

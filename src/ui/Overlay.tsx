import { useEffect, useState } from 'react'
import { CHAPTERS } from './chapters'
import { PAINTS, RIMS, VIEWS, set, useStore } from '../state'
import { DesignPanel } from './Design'
import * as audio from '../audio'
import { BODY_RES } from '../car/body'

function Telemetry() {
  const progress = useStore((s) => s.progress)
  const paint = useStore((s) => s.paint)
  const chapter = useStore((s) => s.chapter)
  return (
    <div className={`hud hud--bl ${progress > 0.9 ? 'hud--away' : ''}`}>
      <div className="hud__row">
        <span className="hud__k">Geometry</span>
        <span className="hud__v">procedural · 0 assets</span>
      </div>
      <div className="hud__row">
        <span className="hud__k">Sections</span>
        <span className="hud__v">
          {BODY_RES.stations} × {BODY_RES.ring}
        </span>
      </div>
      <div className="hud__row">
        <span className="hud__k">Finish</span>
        <span className="hud__v">
          {paint.code} · {paint.finish}
        </span>
      </div>
      <div className="hud__row">
        <span className="hud__k">Timeline</span>
        <span className="hud__v">{(progress * 100).toFixed(0).padStart(3, '0')}%</span>
      </div>
      <div className="hud__bar">
        <i style={{ transform: `scaleX(${progress})` }} />
      </div>
      <div className="hud__chapters">
        {CHAPTERS.map((c, i) => (
          <span key={c.index} className={i === chapter ? 'on' : ''}>
            {c.index}
          </span>
        ))}
      </div>
    </div>
  )
}

function Configurator() {
  const paint = useStore((s) => s.paint)
  const rim = useStore((s) => s.rim)
  const night = useStore((s) => s.night)
  const spin = useStore((s) => s.spin)
  const chapter = useStore((s) => s.chapter)
  const view = useStore((s) => s.view)
  const exploded = useStore((s) => s.exploded)
  const rain = useStore((s) => s.rain)
  const open = chapter >= 1

  return (
    <div className={`panel ${open ? 'panel--open' : ''} ${chapter >= 2 ? 'panel--focus' : ''}`}>
      <div className="panel__head">
        <span className="micro">Configurator</span>
        <span className="micro micro--dim">{paint.name}</span>
      </div>

      <div className="swatches">
        {PAINTS.map((p) => (
          <button
            key={p.id}
            className={`swatch ${p.id === paint.id ? 'is-on' : ''}`}
            style={{ ['--c' as string]: p.color, ['--f' as string]: p.flake }}
            onClick={() => {
              set({ paint: p, glitch: true })
              setTimeout(() => set({ glitch: false }), 150)
              audio.blip()
            }}
            aria-label={p.name}
            title={`${p.name} · ${p.code}`}
          />
        ))}
      </div>

      <DesignPanel />

      <div className="panel__head panel__head--sub">
        <span className="micro">Surface</span>
      </div>
      <div className="chips">
        {VIEWS.map((v) => (
          <button key={v.id} className={`chip ${v.id === view ? 'is-on' : ''}`} onClick={() => {
              set({ view: v.id, glitch: true })
              setTimeout(() => set({ glitch: false }), 150)
              audio.sweep()
            }}>
            {v.name}
          </button>
        ))}
      </div>

      <div className="panel__head panel__head--sub">
        <span className="micro">Wheels</span>
      </div>
      <div className="chips">
        {RIMS.map((r) => (
          <button key={r.id} className={`chip ${r.id === rim.id ? 'is-on' : ''}`} onClick={() => {
              set({ rim: r, glitch: true })
              setTimeout(() => set({ glitch: false }), 150)
              audio.blip()
            }}>
            {r.name}
          </button>
        ))}
      </div>

      <div className="chips chips--wide">
        <button className={`chip ${rain ? 'is-on' : ''}`} onClick={() => set({ rain: !rain })}>
          {rain ? 'Rain off' : 'Rain on'}
        </button>
        <button className={`chip ${night ? 'is-on' : ''}`} onClick={() => set({ night: !night })}>
          {night ? 'Lights on' : 'Lights off'}
        </button>
        <button className={`chip ${spin ? 'is-on' : ''}`} onClick={() => set({ spin: !spin })}>
          {spin ? 'Wheels turning' : 'Wheels still'}
        </button>
        <button className={`chip ${exploded ? 'is-on' : ''}`} onClick={() => {
          set({ exploded: !exploded })
          audio.sweep()
        }}>
          {exploded ? 'Reconstruct' : 'Deconstruct'}
        </button>
        <button className="chip" onClick={() => {
          set({ photoMode: true })
          audio.blip()
        }}>
          Photo Mode
        </button>
      </div>
    </div>
  )
}

function SoundToggle() {
  const [on, setOn] = useState(false)
  return (
    <button
      className={`sound ${on ? 'sound--on' : ''}`}
      aria-pressed={on}
      onClick={() => {
        if (on) {
          audio.disable()
          setOn(false)
        } else {
          void audio.enable()
          setOn(true)
        }
      }}
    >
      <span className="sound__bars" aria-hidden>
        <i />
        <i />
        <i />
      </span>
      <span className="micro">{on ? 'Sound on' : 'Sound off'}</span>
    </button>
  )
}

function Boot() {
  const loaded = useStore((s) => s.loaded)
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    if (!loaded) return
    const t = setTimeout(() => setHidden(true), 900)
    return () => clearTimeout(t)
  }, [loaded])
  if (hidden) return null
  return (
    <div className={`boot ${loaded ? 'boot--out' : ''}`}>
      <div className="boot__inner">
        <div className="mark mark--big">ORBIT</div>
        <div className="boot__line">
          <i />
        </div>
        <div className="micro micro--dim">
          Generating body · {(BODY_RES.stations * BODY_RES.ring).toLocaleString('en-US')} points
        </div>
      </div>
    </div>
  )
}

import { Cursor } from './Cursor'
import { SplitText } from './SplitText'

export function Overlay() {
  const chapter = useStore((s) => s.chapter)
  const launching = useStore((s) => s.launching)
  const photoMode = useStore((s) => s.photoMode)

  useEffect(() => {
    if (launching) document.body.classList.add('is-launching')
    else document.body.classList.remove('is-launching')
  }, [launching])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') set({ photoMode: false })
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <Cursor />
      <Boot />
      {!photoMode && (
        <>
          <div className="frame">
            <div className="frame__tl">
              <span className="mark">ORBIT</span>
              <span className="micro micro--dim">Concept 01 · generative hypercar</span>
            </div>
            <div className="frame__tr">
              <span className="micro">
                {CHAPTERS[chapter].index} <em>/ 05</em>
              </span>
              <span className="micro micro--dim">{CHAPTERS[chapter].label}</span>
              <SoundToggle />
            </div>
          </div>

          <Telemetry />
          <Configurator />

          <div className="scroll">
            {CHAPTERS.map((c, i) => (
              <section
                key={c.index}
                className={`chapter ${i % 2 === 1 ? 'chapter--right' : ''} ${i === chapter ? 'is-active' : ''}`}
              >
                <div className={`copy ${i % 2 === 1 ? 'copy--right' : ''}`}>
                  <span className="micro copy__idx">
                    <i /> {c.index} — {c.label}
                  </span>
                  <h2>
                    <SplitText delayOffset={0.1}>{c.title}</SplitText>
                  </h2>
                  <p>
                    <SplitText delayOffset={0.3}>{c.body}</SplitText>
                  </p>
                  {c.note && (
                    <span className="cue">
                      {c.note}
                      <b />
                    </span>
                  )}
                </div>
              </section>
            ))}
            <footer className="outro">
              <div className="outro__inner">
                <h3>ORBIT</h3>
                <div className="outro__grid">
                  <div>
                    <span className="micro">Built with</span>
                    <p>three.js · react-three-fiber · postprocessing</p>
                  </div>
                  <div>
                    <span className="micro">Assets downloaded</span>
                    <p>none — 0 KB of geometry, 0 KB of textures, 0 KB of HDRI</p>
                  </div>
                  <div>
                    <span className="micro">Everything you saw</span>
                    <p>four curves, one lofted shell, six lights drawn in code</p>
                  </div>
                </div>
                <div className="outro__foot">
                  <button 
                    className="ignite-btn"
                    onClick={async () => {
                      set({ launching: true })
                      try {
                        await audio.enable()
                        audio.playLaunch()
                      } catch (e) {
                        console.error(e)
                      }
                    }}
                  >
                    IGNITE
                  </button>
                </div>
              </div>
            </footer>
          </div>
        </>
      )}

      {photoMode && (
        <>
          <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '32px',
            zIndex: 9999,
            pointerEvents: 'none',
            color: '#fff',
            fontFamily: 'sans-serif',
            textAlign: 'right',
          }}>
            <div style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '4px', marginBottom: '4px' }}>ORBIT</div>
            <div style={{ fontSize: '11px', opacity: 0.6, letterSpacing: '2px', textTransform: 'uppercase' }}>Hackathon 2026</div>
          </div>
          <button 
            onClick={() => set({ photoMode: false })}
            style={{
              position: 'fixed',
              top: '24px',
              right: '32px',
              zIndex: 9999,
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              borderRadius: '4px',
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
              fontFamily: 'sans-serif',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            Exit Photo Mode (ESC)
          </button>
        </>
      )}
      <Finale />
      <CinematicLetterbox />
      <Speedometer />
    </>
  )
}

function Speedometer() {
  const launching = useStore((s) => s.launching)
  const [speed, setSpeed] = useState(0)

  useEffect(() => {
    if (!launching) {
      setSpeed(0)
      return
    }

    let start = Date.now()
    let req: number

    const update = () => {
      const now = Date.now()
      const elapsed = (now - start) / 1000
      
      const currentSpeed = Math.floor(Math.pow(elapsed * 2, 3) * 10)
      setSpeed(Math.min(9999, currentSpeed))
      
      req = requestAnimationFrame(update)
    }
    
    req = requestAnimationFrame(update)
    return () => cancelAnimationFrame(req)
  }, [launching])

  if (!launching) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '15%',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10000,
      color: '#ff4d1c',
      fontFamily: 'monospace, sans-serif',
      fontSize: '8vw',
      fontWeight: 'bold',
      textShadow: '0 0 20px #ff4d1c, 0 0 40px #ff4d1c',
      pointerEvents: 'none',
      textAlign: 'center',
      lineHeight: 1
    }}>
      {speed.toString().padStart(4, '0')}
      <div style={{ fontSize: '1.5vw', letterSpacing: '0.2em', opacity: 0.8, marginTop: '10px' }}>KM/H</div>
    </div>
  )
}

function CinematicLetterbox() {
  const launching = useStore((s) => s.launching)
  const baseStyle: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    right: 0,
    height: launching ? '12%' : '0%',
    backgroundColor: '#000',
    zIndex: 9999,
    transition: 'height 0.8s cubic-bezier(0.65, 0, 0.35, 1)',
    pointerEvents: 'none'
  }

  return (
    <>
      <div style={{ ...baseStyle, top: 0 }} />
      <div style={{ ...baseStyle, bottom: 0 }} />
    </>
  )
}

function Finale() {
  const launching = useStore((s) => s.launching)
  return (
    <div className={`finale ${launching ? 'is-active' : ''}`}>
      <div className="finale__credits">
        <h2>ORBIT</h2>
        <p>A procedural generative study.</p>
        <span className="micro micro--dim">Hackathon 2026 · 0 Assets</span>
      </div>
    </div>
  )
}

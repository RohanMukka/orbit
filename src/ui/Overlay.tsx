import { useEffect, useState, useRef } from 'react'
import { CHAPTERS } from './chapters'
import { PAINTS, RIMS, VIEWS, set, useStore, peek, subscribe } from '../state'
import { DesignPanel } from './Design'
import * as audio from '../audio'
import { BODY_RES } from '../car/body'

function getHexProgress(prog: number, vel: number) {
  if (Math.abs(vel) > 55) {
    return Math.floor(Math.random() * 0xfff).toString(16).padStart(3, '0').toUpperCase() + '%'
  }
  return (prog * 100).toFixed(0).padStart(3, '0') + '%'
}

function Telemetry() {
  const progress = useStore((s) => s.progress)
  const paint = useStore((s) => s.paint)
  const chapter = useStore((s) => s.chapter)
  const scrollVelocity = useStore((s) => s.scrollVelocity)
  // Velocity is in px/frame and regularly passes 40, so both of these have to
  // be clamped — unbounded they took the HUD to blur(80px) at 20% opacity.
  const vel = Math.abs(scrollVelocity || 0)
  const blurAmount = Math.min(1.4, vel * 0.03)
  const opacity = Math.max(0.72, 1.0 - vel * 0.01)
  return (
    <div className={`hud hud--bl ${progress > 0.9 ? 'hud--away' : ''}`} style={{ filter: `blur(${blurAmount}px)`, opacity }}>
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
        <span className="hud__v">{getHexProgress(progress, scrollVelocity)}</span>
      </div>
      <div className="hud__row">
        <span className="hud__k">G-Force</span>
        <span className="hud__v">{(1.0 + Math.abs(scrollVelocity || 0) * 15).toFixed(2) + 'G'}</span>
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
          set({ photoMode: true, flash: true })
          setTimeout(() => set({ flash: false }), 50)
          audio.sweep()
        }}>
          Photo Mode
        </button>
        <button className="chip" onClick={() => {
          const newShape = {
            roof: [0, Math.random() * 0.6 - 0.3, Math.random() * 0.8 - 0.2, Math.random() * 0.6 - 0.3, 0],
            width: [0, Math.random() * 0.5 - 0.2, Math.random() * 0.7 - 0.2, Math.random() * 0.5 - 0.2, 0]
          }
          set({ shape: newShape, glitch: true })
          setTimeout(() => set({ glitch: false }), 150)
          audio.sweep()
        }}>
          Auto-Sculpt
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
  const [text, setText] = useState('&#*@!')

  useEffect(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()'
    const target = 'O R B I T'
    let iteration = 0
    
    const interval = setInterval(() => {
      iteration += 1
      setText(
        target
          .split('')
          .map((letter, index) => {
            if (letter === ' ') return ' '
            if (index < iteration / 2) {
              return target[index]
            }
            return chars[Math.floor(Math.random() * chars.length)]
          })
          .join('')
      )

      if (iteration >= target.length * 2) {
        clearInterval(interval)
      }
    }, 50)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!loaded) return
    const t = setTimeout(() => setHidden(true), 900)
    return () => clearTimeout(t)
  }, [loaded])
  
  if (hidden) return null
  return (
    <div className={`boot ${loaded ? 'boot--out' : ''}`}>
      <div className="boot__inner">
        <div className="mark mark--big">{text}</div>
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
  const flash = useStore((s) => s.flash)

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

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  /**
   * The kinetic tilt is written straight to the node's style rather than kept
   * in React state. Subscribing this component to scrollVelocity re-rendered
   * the entire overlay — every chapter, every SplitText span, the configurator
   * — on every frame of every scroll, to move one element. The transform is a
   * compositor-only property, so setting it here skips reconciliation entirely.
   */
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    const apply = () => {
      raf = 0
      const el = scrollRef.current
      if (!el) return
      const s = peek()
      const v = s.scrollVelocity || 0
      const vel = Math.abs(v)
      const rattleX = vel > 30 ? Math.sin(Date.now() * 0.5) * (vel * 0.05) : 0
      const rattleY = vel > 30 ? Math.cos(Date.now() * 0.6) * (vel * 0.05) : 0
      const rotX = s.launching ? 2 : v * -0.02
      const zPush = s.launching ? -50 : v * 0.1
      el.style.transform =
        `translate3d(${rattleX}px, ${rattleY}px, ${zPush}px) scale(${s.launching ? 1.03 : 1})` +
        ` perspective(1000px) rotateX(${rotX}deg) translateY(${s.launching ? -1 : 0}%)`
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply)
    }
    apply()
    const unsub = subscribe(schedule)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      unsub()
    }
  }, [photoMode])

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, backgroundColor: 'white', zIndex: 10000, pointerEvents: 'none',
        opacity: flash ? 1 : 0, transition: flash ? 'none' : 'opacity 0.8s ease-out'
      }} />
      {/*
        No transform and no backdrop-filter on this element, ever. It wraps the
        whole overlay including .scroll, so it is as tall as the document — and
        either property would make it the containing block for every
        position:fixed child, which parks the HUD and the configurator a full
        page below the viewport and blurs the canvas behind all 5400px of it.
        The kinetic transform lives on .scroll instead, which holds nothing fixed.
      */}
      <div className="ui-container" style={{
        opacity: mounted ? (photoMode ? 0 : 1) : 0,
        transition: 'opacity 1.2s ease-out',
      }}>
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

            <div className="scroll" ref={scrollRef}>
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
      </div>
    </>
  )
}

function Speedometer() {
  const launching = useStore((s) => s.launching)
  const [speed, setSpeed] = useState(0)
  const valRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!launching) {
      setSpeed(0)
      if (valRef.current) valRef.current.style.transform = 'translate(0px, 0px)'
      return
    }

    let start = Date.now()
    let req: number

    const update = () => {
      const now = Date.now()
      const elapsed = (now - start) / 1000
      
      const currentSpeed = Math.floor(Math.pow(elapsed * 2, 3) * 10)
      setSpeed(Math.min(9999, currentSpeed))
      
      if (peek().launching) {
        if (valRef.current) valRef.current.style.transform = `translate(${(Math.random() - 0.5) * 8}px, ${(Math.random() - 0.5) * 8}px)`
      } else {
        if (valRef.current) valRef.current.style.transform = 'translate(0px, 0px)'
      }

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
      <div ref={valRef}>
        {speed.toString().padStart(4, '0')}
        <div style={{ fontSize: '1.5vw', letterSpacing: '0.2em', opacity: 0.8, marginTop: '10px' }}>KM/H</div>
      </div>
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

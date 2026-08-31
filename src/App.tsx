import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Preload, useProgress } from '@react-three/drei'
import * as THREE from 'three'
import { Car } from './car/Car'
import { Studio } from './scene/Studio'
import { ScannerLight } from './scene/ScannerLight'
import { Rig, SHOTS, chapterFloat } from './scene/Rig'
import { Effects } from './scene/Effects'
import { Hyperspace } from './scene/Hyperspace'
import { Exhaust } from './scene/Exhaust'
import { WeldingSparks } from './scene/WeldingSparks'
import { CyberRain } from './scene/Weather'
import { CyberDust } from './scene/Dust'
import { TireSmoke } from './scene/TireSmoke'
import { FloorDust } from './scene/FloorDust'
import { Overlay } from './ui/Overlay'
import { set, peek, viewLocked, useStore } from './state'
import * as audio from './audio'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

function LoadFlag() {
  const { progress } = useProgress()
  useEffect(() => {
    if (progress >= 100) set({ loaded: true })
  }, [progress])
  // The body is built synchronously, so flag ready on first commit too.
  useEffect(() => {
    const t = setTimeout(() => set({ loaded: true }), 2400)
    return () => clearTimeout(t)
  }, [])
  return null
}

function useScrollDriver() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    })

    const read = (e: any) => {
      const scroll = e.scroll
      const vel = e.velocity
      const max = document.documentElement.scrollHeight - window.innerHeight
      const progress = max > 0 ? Math.min(1, Math.max(0, scroll / max)) : 0
      const chapter = Math.round(chapterFloat(progress))
      const prev = peek()
      if (chapter !== prev.chapter) {
        audio.setNight(chapter === SHOTS.length - 1)
        set({
          chapter,
          night: chapter === SHOTS.length - 1,
          spin: chapter >= 1,
          // chapter 02 is about how the body is built — show the blueprint
          ...(viewLocked ? null : { view: chapter === 1 ? ('wire' as const) : ('render' as const) }),
        })
      }
      set({ progress, entered: progress > 0.01 || prev.entered, scrollVelocity: vel })
      audio.setScroll(progress)
      if (prev.rain) {
        audio.updateRain(prev.launching ? 500 : vel)
      }
    }

    lenis.on('scroll', read)

    let rafId = 0
    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    // Trigger an initial read
    read({ scroll: window.scrollY, velocity: 0 })

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [])
}

export function App() {
  useScrollDriver()
  const rain = useStore(s => s.rain)
  useEffect(() => { audio.setRain(rain) }, [rain])

  return (
    <>
      <div className="stage">
        <Canvas
          shadows
          dpr={[1, 1.85]}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
          camera={{ position: SHOTS[0].pos, fov: SHOTS[0].fov, near: 0.1, far: 120 }}
          onCreated={({ gl, scene }) => {
            // The body sweeps into existence behind a clip plane on load.
            gl.localClippingEnabled = true
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 1.0
            scene.fog = new THREE.FogExp2('#05060a', 0.031)
          }}
        >
          <Suspense fallback={null}>
            <Studio />
            <ScannerLight />
            <Car />
            <Exhaust />
            <Effects />
            <WeldingSparks />
            <CyberRain />
            <CyberDust />
            <TireSmoke />
            <Hyperspace />
            <FloorDust />
            <Preload all />
          </Suspense>
          <Rig />
        </Canvas>
        <LoadFlag />
      </div>
      <Overlay />
      <div className="grain" aria-hidden />
    </>
  )
}

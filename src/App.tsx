import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, Preload, useProgress } from '@react-three/drei'
import * as THREE from 'three'
import { Car } from './car/Car'
import { Studio } from './scene/Studio'
import { Rig, SHOTS, chapterFloat } from './scene/Rig'
import { Effects } from './scene/Effects'
import { Hyperspace } from './scene/Hyperspace'
import { Overlay } from './ui/Overlay'
import { set, peek, viewLocked } from './state'
import * as audio from './audio'

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
    let raf = 0
    const read = () => {
      raf = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
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
      set({ progress, entered: progress > 0.01 || prev.entered })
      audio.setScroll(progress)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read)
    }
    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
}

export function App() {
  useScrollDriver()

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
            <Car />
            <Effects />
            <Hyperspace />
            <Preload all />
          </Suspense>
          <Rig />
          <AdaptiveDpr pixelated />
        </Canvas>
        <LoadFlag />
      </div>
      <Overlay />
      <div className="grain" aria-hidden />
    </>
  )
}

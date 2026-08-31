import { EffectComposer, Bloom, ChromaticAberration, Vignette, Noise, SMAA } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useStore, peek } from '../state'

export function Effects() {
  const ca = useMemo(() => new THREE.Vector2(0.0005, 0.0005), [])
  const caRef = useRef<any>(null)
  const noiseRef = useRef<any>(null)
  const vignetteRef = useRef<any>(null)
  const bloomRef = useRef<any>(null)
  const launching = useStore(s => s.launching)
  const glitch = useStore(s => s.glitch)

  useFrame((state, dt) => {
    const s = peek()
    const dampFactor = glitch ? 15 : 4
    if (caRef.current) {
      // Every one of these terms lands on the car, so they are kept an order of
      // magnitude below the point where the split reads as a soft edge.
      const velTear = Math.min(0.0008, Math.abs(s.scrollVelocity || 0) * 0.00004)
      const breath = Math.sin(state.clock.elapsedTime * 1.5) * 0.00012
      const rest = 0.0005 + breath
      const targetX = (glitch ? 0.02 : launching ? 0.008 : rest) + velTear
      const targetY = (glitch ? 0.02 : launching ? 0.008 : rest) + velTear
      caRef.current.offset.x = THREE.MathUtils.damp(caRef.current.offset.x, targetX, dampFactor, dt)
      caRef.current.offset.y = THREE.MathUtils.damp(caRef.current.offset.y, targetY, dampFactor, dt)
    }
    if (noiseRef.current) {
      const velModNoise = Math.min(0.03, Math.abs(s.scrollVelocity || 0) * 0.0015)
      const targetOpacity = (glitch ? 0.35 : launching ? 0.16 : 0.018) + velModNoise
      noiseRef.current.blendMode.opacity.value = THREE.MathUtils.damp(noiseRef.current.blendMode.opacity.value, targetOpacity, dampFactor, dt)
    }
    if (vignetteRef.current) {
      const targetDarkness = Math.min(0.95, (launching ? 0.8 : 0.55) + Math.abs(s.scrollVelocity || 0) * 0.002)
      vignetteRef.current.darkness = THREE.MathUtils.damp(vignetteRef.current.darkness, targetDarkness, dampFactor, dt)
      const breath = Math.sin(state.clock.elapsedTime * 2) * 0.04
      const shake = launching ? Math.sin(state.clock.elapsedTime * 45) * 0.03 : 0
      vignetteRef.current.offset = THREE.MathUtils.damp(vignetteRef.current.offset, 0.38 + breath + shake, 10, dt)
    }
    if (bloomRef.current) {
      const surge = launching ? 0.85 + Math.sin(state.clock.elapsedTime * 20) * 0.2 : 0.34
      const targetBloom = surge + Math.min(0.12, Math.abs(s.scrollVelocity || 0) * 0.0008)
      bloomRef.current.intensity = THREE.MathUtils.damp(bloomRef.current.intensity, targetBloom, dampFactor, dt)
    }
  })

  return (
    <>
      <DynamicFog />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom ref={bloomRef} intensity={0.34} luminanceThreshold={0.92} luminanceSmoothing={0.12} mipmapBlur radius={0.45} />
        <ChromaticAberration ref={caRef} offset={ca} radialModulation modulationOffset={0.42} blendFunction={BlendFunction.NORMAL} />
        <Vignette ref={vignetteRef} offset={0.38} darkness={0.55} />
        <Noise ref={noiseRef} premultiply opacity={0.018} blendFunction={BlendFunction.OVERLAY} />
        <SMAA />
      </EffectComposer>
    </>
  )
}

function DynamicFog() {
  const scene = useThree(s => s.scene)
  useFrame((_, dt) => {
    if (scene.fog && (scene.fog as THREE.FogExp2).density !== undefined) {
      const s = peek()
      const targetDensity = 0.016 + Math.min(0.006, Math.abs(s.scrollVelocity || 0) * 0.0002)
      const fog = scene.fog as THREE.FogExp2
      fog.density = THREE.MathUtils.damp(fog.density, targetDensity, 4, dt)
    }
  })
  return null
}

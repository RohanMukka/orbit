import { EffectComposer, Bloom, ChromaticAberration, Vignette, Noise, SMAA } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore, peek } from '../state'

export function Effects() {
  const ca = useMemo(() => new THREE.Vector2(0.0006, 0.0004), [])
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
      const velTear = Math.abs(s.scrollVelocity || 0) * 0.0002
      const breath = Math.sin(state.clock.elapsedTime * 1.5) * 0.0005
      const targetX = (glitch ? 0.03 : launching ? 0.015 : 0.0006 + breath) + velTear
      const targetY = (glitch ? 0.03 : launching ? 0.015 : 0.0006 + breath) + velTear
      caRef.current.offset.x = THREE.MathUtils.damp(caRef.current.offset.x, targetX, dampFactor, dt)
      caRef.current.offset.y = THREE.MathUtils.damp(caRef.current.offset.y, targetY, dampFactor, dt)
    }
    if (noiseRef.current) {
      const velModNoise = Math.abs(s.scrollVelocity || 0) * 0.01
      const targetOpacity = (glitch ? 0.6 : launching ? 0.25 : 0.035) + velModNoise
      noiseRef.current.blendMode.opacity.value = THREE.MathUtils.damp(noiseRef.current.blendMode.opacity.value, targetOpacity, dampFactor, dt)
    }
    if (vignetteRef.current) {
      const targetDarkness = Math.min(1.5, (launching ? 1.15 : 0.85) + Math.abs(s.scrollVelocity || 0) * 0.005)
      vignetteRef.current.darkness = THREE.MathUtils.damp(vignetteRef.current.darkness, targetDarkness, dampFactor, dt)
      const breath = Math.sin(state.clock.elapsedTime * 2) * 0.04
      const shake = launching ? Math.sin(state.clock.elapsedTime * 45) * 0.03 : 0
      vignetteRef.current.offset = THREE.MathUtils.damp(vignetteRef.current.offset, 0.28 + breath + shake, 10, dt)
    }
    if (bloomRef.current) {
      const surge = launching ? 1.2 + Math.sin(state.clock.elapsedTime * 20) * 0.3 : 0.5
      const targetBloom = surge + Math.abs(s.scrollVelocity || 0) * 0.002
      bloomRef.current.intensity = THREE.MathUtils.damp(bloomRef.current.intensity, targetBloom, dampFactor, dt)
    }
  })

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom ref={bloomRef} intensity={0.8} luminanceThreshold={0.7} luminanceSmoothing={0.4} mipmapBlur radius={0.8} />
      <ChromaticAberration ref={caRef} offset={ca} radialModulation modulationOffset={0.42} blendFunction={BlendFunction.NORMAL} />
      <Vignette ref={vignetteRef} offset={0.28} darkness={0.85} />
      <Noise ref={noiseRef} premultiply opacity={0.035} blendFunction={BlendFunction.OVERLAY} />
      <SMAA />
    </EffectComposer>
  )
}

import { EffectComposer, Bloom, ChromaticAberration, Vignette, Noise, SMAA, Glitch } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../state'

export function Effects() {
  const ca = useMemo(() => new THREE.Vector2(0.0006, 0.0004), [])
  const caRef = useRef<any>(null)
  const noiseRef = useRef<any>(null)
  const vignetteRef = useRef<any>(null)
  const launching = useStore(s => s.launching)
  const glitch = useStore(s => s.glitch)
  const view = useStore(s => s.view)

  useFrame((_, dt) => {
    const dampFactor = glitch ? 15 : 4
    if (caRef.current) {
      const targetX = glitch ? 0.03 : launching ? 0.015 : 0.0006
      const targetY = glitch ? 0.02 : launching ? 0.01 : 0.0004
      caRef.current.offset.x = THREE.MathUtils.damp(caRef.current.offset.x, targetX, dampFactor, dt)
      caRef.current.offset.y = THREE.MathUtils.damp(caRef.current.offset.y, targetY, dampFactor, dt)
    }
    if (noiseRef.current) {
      const targetOpacity = glitch ? 0.6 : launching ? 0.25 : 0.035
      noiseRef.current.blendMode.opacity.value = THREE.MathUtils.damp(noiseRef.current.blendMode.opacity.value, targetOpacity, dampFactor, dt)
    }
    if (vignetteRef.current) {
      const targetDarkness = launching ? 1.15 : 0.85
      vignetteRef.current.darkness = THREE.MathUtils.damp(vignetteRef.current.darkness, targetDarkness, dampFactor, dt)
    }
  })

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Glitch delay={[1.5, 3.5] as any} duration={[0.1, 0.3] as any} strength={[0.01, 0.05] as any} active={view === 'wire'} />
      <Bloom intensity={0.8} luminanceThreshold={0.7} luminanceSmoothing={0.4} mipmapBlur radius={0.8} />
      <ChromaticAberration ref={caRef} offset={ca} radialModulation modulationOffset={0.42} blendFunction={BlendFunction.NORMAL} />
      <Vignette ref={vignetteRef} offset={0.28} darkness={0.85} />
      <Noise ref={noiseRef} premultiply opacity={0.035} blendFunction={BlendFunction.OVERLAY} />
      <SMAA />
    </EffectComposer>
  )
}

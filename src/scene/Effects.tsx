import { EffectComposer, Bloom, ChromaticAberration, Vignette, Noise, SMAA } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../state'

export function Effects() {
  const ca = useMemo(() => new THREE.Vector2(0.0006, 0.0004), [])
  const caRef = useRef<any>(null)
  const noiseRef = useRef<any>(null)
  const launching = useStore(s => s.launching)

  useFrame((_, dt) => {
    if (caRef.current) {
      const targetX = launching ? 0.015 : 0.0006
      const targetY = launching ? 0.01 : 0.0004
      caRef.current.offset.x = THREE.MathUtils.damp(caRef.current.offset.x, targetX, 4, dt)
      caRef.current.offset.y = THREE.MathUtils.damp(caRef.current.offset.y, targetY, 4, dt)
    }
    if (noiseRef.current) {
      const targetOpacity = launching ? 0.25 : 0.035
      noiseRef.current.blendMode.opacity.value = THREE.MathUtils.damp(noiseRef.current.blendMode.opacity.value, targetOpacity, 4, dt)
    }
  })

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom intensity={0.8} luminanceThreshold={0.7} luminanceSmoothing={0.4} mipmapBlur radius={0.8} />
      <ChromaticAberration ref={caRef} offset={ca} radialModulation modulationOffset={0.42} blendFunction={BlendFunction.NORMAL} />
      <Vignette offset={0.28} darkness={0.85} />
      <Noise ref={noiseRef} premultiply opacity={0.035} blendFunction={BlendFunction.OVERLAY} />
      <SMAA />
    </EffectComposer>
  )
}

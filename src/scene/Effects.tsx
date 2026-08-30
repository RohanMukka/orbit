import { EffectComposer, Bloom, ChromaticAberration, Vignette, Noise, SMAA, DepthOfField } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { useMemo } from 'react'

export function Effects() {
  const ca = useMemo(() => new THREE.Vector2(0.0006, 0.0004), [])
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <DepthOfField focusDistance={0.015} focalLength={0.04} bokehScale={3.5} />
      <Bloom intensity={0.62} luminanceThreshold={0.8} luminanceSmoothing={0.3} mipmapBlur radius={0.68} />
      <ChromaticAberration offset={ca} radialModulation modulationOffset={0.42} blendFunction={BlendFunction.NORMAL} />
      <Vignette offset={0.28} darkness={0.85} />
      <Noise premultiply opacity={0.035} blendFunction={BlendFunction.OVERLAY} />
      <SMAA />
    </EffectComposer>
  )
}

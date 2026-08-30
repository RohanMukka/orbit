import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../state'
import * as THREE from 'three'

export function ScannerLight() {
  const paintId = useStore((s) => s.paint.id)
  const glitch = useStore((s) => s.glitch)
  const timer = useRef(1.5)
  const isFirstRender = useRef(true)
  const lightRef = useRef<THREE.RectAreaLight>(null)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    timer.current = 0
  }, [paintId, glitch])

  useFrame((_, delta) => {
    if (!lightRef.current) return
    
    if (timer.current < 1.0) {
      timer.current += delta
      const progress = Math.min(timer.current, 1.0)
      
      // Move from front (+3) to back (-3)
      lightRef.current.position.x = 3 - 6 * progress
      
      // Intensely bright cyan, fade out at the end
      let intensity = 100
      if (progress > 0.8) {
        intensity = 100 * (1 - (progress - 0.8) / 0.2)
      }
      lightRef.current.intensity = intensity
    } else {
      lightRef.current.intensity = 0
    }
  })

  return (
    <rectAreaLight
      ref={lightRef}
      color="#00ffcc"
      position={[3, 2, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      width={0.2}
      height={3}
      intensity={0}
    />
  )
}

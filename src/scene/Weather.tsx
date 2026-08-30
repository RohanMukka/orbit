import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore, peek } from '../state'

const COUNT = 2000

export function CyberRain() {
  const rain = useStore((s) => s.rain)
  const meshRef = useRef<THREE.InstancedMesh>(null)
  
  const dummy = useMemo(() => new THREE.Object3D(), [])
  
  const positions = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 20
      pos[i * 3 + 1] = Math.random() * 10
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20
    }
    return pos
  }, [])
  
  useFrame((_, dt) => {
    if (!rain || !meshRef.current) return
    const s = peek()
    
    for (let i = 0; i < COUNT; i++) {
      let y = positions[i * 3 + 1]
      let z = positions[i * 3 + 2]
      
      y -= dt * 15
      z -= (s.scrollVelocity || 0) * dt * 0.5
      
      if (y < 0) {
        y = 10
        positions[i * 3 + 0] = (Math.random() - 0.5) * 20
        z = (Math.random() - 0.5) * 20
      }
      if (z < -15) z += 30
      if (z > 15) z -= 30
      
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
      
      dummy.position.set(positions[i * 3 + 0], y, z)
      dummy.scale.set(1, s.launching ? 40.0 : 1.0, 1)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })
  
  if (!rain) return null
  
  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined as any, undefined as any, COUNT]}>
        <boxGeometry args={[0.01, 0.4, 0.01]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.5} />
      </instancedMesh>
      <RainSplashes />
    </>
  )
}

export function RainSplashes() {
  const rain = useStore((s) => s.rain)
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const splashes = useMemo(() => {
    return Array.from({ length: 500 }, () => ({
      x: (Math.random() - 0.5) * 20,
      z: (Math.random() - 0.5) * 20,
      scale: 1.5 + Math.random(),
    }))
  }, [])

  useFrame((_, dt) => {
    if (!rain || !meshRef.current) return
    
    for (let i = 0; i < 500; i++) {
      const d = splashes[i]
      d.scale -= dt * 5.0
      
      if (d.scale <= 0) {
        d.scale = 1.5 + Math.random()
        d.x = (Math.random() - 0.5) * 20
        d.z = (Math.random() - 0.5) * 20
      }
      
      dummy.position.set(d.x, 0.01, d.z)
      dummy.scale.set(d.scale, d.scale, d.scale)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  if (!rain) return null

  return (
    <instancedMesh ref={meshRef} args={[undefined as any, undefined as any, 500]}>
      <boxGeometry args={[0.02, 0.02, 0.02]} />
      <meshBasicMaterial color="#ffffff" transparent depthWrite={false} />
    </instancedMesh>
  )
}

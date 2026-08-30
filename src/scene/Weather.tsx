import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../state'

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
    
    for (let i = 0; i < COUNT; i++) {
      let y = positions[i * 3 + 1]
      y -= dt * 15
      
      if (y < 0) {
        y = 10
        positions[i * 3 + 0] = (Math.random() - 0.5) * 20
        positions[i * 3 + 2] = (Math.random() - 0.5) * 20
      }
      positions[i * 3 + 1] = y
      
      dummy.position.set(positions[i * 3 + 0], y, positions[i * 3 + 2])
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })
  
  if (!rain) return null
  
  return (
    <instancedMesh ref={meshRef} args={[undefined as any, undefined as any, COUNT]}>
      <boxGeometry args={[0.01, 0.4, 0.01]} />
      <meshBasicMaterial color="#00ffff" transparent opacity={0.5} />
    </instancedMesh>
  )
}

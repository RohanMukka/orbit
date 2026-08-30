import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../state'

export function FloorDust() {
  const launching = useStore((s) => s.launching)
  const count = 300
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const particles = useMemo(() => {
    const arr = []
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = 0.5 + Math.random() * 3.5
      const x = Math.cos(angle) * radius
      const y = 0
      const z = Math.sin(angle) * radius
      arr.push({ x, y, z, vy: 0 })
    }
    return arr
  }, [])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((_, dt) => {
    if (!meshRef.current) return
    let needsUpdate = false

    for (let i = 0; i < count; i++) {
      const p = particles[i]
      if (launching) {
        p.vy -= dt * 9.8
        p.y += p.vy * dt
        if (p.y < 0) {
          p.vy = 1.0 + Math.random() * 4.0
          p.y = 0
        }
        needsUpdate = true
      } else {
        if (p.y > 0.001) {
          p.y -= p.y * Math.min(dt * 5, 1)
          p.vy = 0
          needsUpdate = true
        } else if (p.y !== 0) {
          p.y = 0
          p.vy = 0
          needsUpdate = true
        }
      }

      if (needsUpdate || launching) {
        dummy.position.set(p.x, p.y, p.z)
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(i, dummy.matrix)
      }
    }

    if (needsUpdate || launching) {
      meshRef.current.instanceMatrix.needsUpdate = true
    }
  })

  // To ensure the initial state is rendered if not launching on first frame
  useFrame(() => {
    if (!meshRef.current || meshRef.current.userData.initialized) return
    for (let i = 0; i < count; i++) {
      const p = particles[i]
      dummy.position.set(p.x, p.y, p.z)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    meshRef.current.userData.initialized = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.015, 0.015, 0.015]} />
      <meshBasicMaterial color="#ffffff" />
    </instancedMesh>
  )
}

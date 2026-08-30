import * as THREE from 'three'
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { peek } from '../state'

export function CyberDust({ count = 500 }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  
  const particles = useMemo(() => {
    const temp = []
    for (let i = 0; i < count; i++) {
      const x = -5 + Math.random() * 10
      const y = Math.random() * 4
      const z = -5 + Math.random() * 10
      
      const vx = (Math.random() - 0.5) * 0.05
      const vy = (Math.random() - 0.5) * 0.05
      const vz = (Math.random() - 0.5) * 0.05

      temp.push({ x, y, z, vx, vy, vz })
    }
    return temp
  }, [count])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((_, delta) => {
    if (!mesh.current) return
    
    const launching = peek().launching

    particles.forEach((particle, i) => {
      particle.x += particle.vx * delta
      particle.y += particle.vy * delta
      particle.z += particle.vz * delta

      if (launching) {
        particle.z -= delta * 150.0
      }

      if (particle.x > 5) particle.x = -5
      if (particle.x < -5) particle.x = 5
      if (particle.y > 4) particle.y = 0
      if (particle.y < 0) particle.y = 4
      if (particle.z > 5) particle.z = -5
      if (particle.z < -5) particle.z = 5

      dummy.position.set(particle.x, particle.y, particle.z)
      if (launching) {
        dummy.scale.set(1, 1, 150.0)
      } else {
        dummy.scale.set(1, 1, 1)
      }
      dummy.updateMatrix()
      mesh.current!.setMatrixAt(i, dummy.matrix)
    })
    
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined as any, undefined as any, count]}>
      <sphereGeometry args={[0.005, 8, 8]} />
      <meshBasicMaterial color="#00ffcc" transparent opacity={0.3} depthWrite={false} />
    </instancedMesh>
  )
}

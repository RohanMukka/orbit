import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore, peek } from '../state'

const COUNT = 200

export function TireSmoke() {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const spin = useStore((s) => s.spin)
  const launching = useStore((s) => s.launching)
  
  const dummy = useMemo(() => new THREE.Object3D(), [])
  
  const particles = useMemo(() => {
    return Array.from({ length: COUNT }, () => ({
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      scale: 0,
      age: 1,
      lifetime: 1,
      active: false
    }))
  }, [])
  
  const spawnIndex = useRef(0)
  
  const tirePositions = useMemo(() => [
    new THREE.Vector3(1.8, 0, 1.2),
    new THREE.Vector3(-1.8, 0, 1.2),
    new THREE.Vector3(1.8, 0, -1.2),
    new THREE.Vector3(-1.8, 0, -1.2),
  ], [])

  useFrame((state, delta) => {
    const mesh = meshRef.current
    if (!mesh) return
    
    if (spin && !launching) {
      for (let i = 0; i < 2; i++) {
        const p = particles[spawnIndex.current]
        p.active = true
        p.age = 0
        const scrollVel = peek().scrollVelocity || 0
        p.lifetime = 1 + Math.random() * 0.5
        p.scale = 0.5 + Math.random() * 0.5 + Math.max(0, scrollVel * 0.05)
        
        const tire = tirePositions[Math.floor(Math.random() * tirePositions.length)]
        
        p.position.copy(tire).add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          Math.random() * 0.5,
          (Math.random() - 0.5) * 0.5
        ))
        
        const steerForce = Math.abs(state.pointer.x) > 0.2 ? state.pointer.x * 2.0 : 0
        p.velocity.set(
          -1 + (Math.random() - 0.5) * 0.5,
          0.5 + Math.random() * 0.5,
          steerForce + (Math.random() - 0.5) * 0.2
        )
        
        spawnIndex.current = (spawnIndex.current + 1) % COUNT
      }
    }
    
    for (let i = 0; i < COUNT; i++) {
      const p = particles[i]
      if (p.active) {
        p.age += delta
        if (p.age >= p.lifetime) {
          p.active = false
          dummy.scale.setScalar(0)
          dummy.updateMatrix()
          mesh.setMatrixAt(i, dummy.matrix)
        } else {
          p.position.addScaledVector(p.velocity, delta)
          const progress = p.age / p.lifetime
          const s = p.scale * (1 - progress) * 3
          
          dummy.position.copy(p.position)
          dummy.scale.setScalar(Math.max(0.001, s))
          dummy.updateMatrix()
          mesh.setMatrixAt(i, dummy.matrix)
        }
      } else {
        dummy.scale.setScalar(0)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
    }
    
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined as any, undefined as any, COUNT]}>
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshBasicMaterial color="#8f949c" transparent opacity={0.1} depthWrite={false} />
    </instancedMesh>
  )
}

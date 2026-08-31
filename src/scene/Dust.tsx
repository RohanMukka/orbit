import * as THREE from 'three'
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { peek } from '../state'

export function CyberDust({ count = 500 }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  
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

  const targetColor = useMemo(() => new THREE.Color(), [])
  const whiteColor = useMemo(() => new THREE.Color('#ffffff'), [])

  useFrame((state, delta) => {
    if (!mesh.current) return
    
    const s = peek()
    const launching = s.launching

    particles.forEach((particle, i) => {
      particle.x += particle.vx * delta
      particle.y += particle.vy * delta
      particle.z += particle.vz * delta
      
      particle.y -= (0.2 + (s.scrollVelocity || 0) * 0.05) * delta
      particle.x += Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.02
      particle.z += Math.cos(state.clock.elapsedTime * 0.3 + i) * 0.02
      
      particle.z -= (s.scrollVelocity || 0) * delta * 0.1

      if (launching) {
        particle.z -= delta * 150.0
      }

      if (particle.x > 5) particle.x = -5
      if (particle.x < -5) particle.x = 5
      if (particle.y > 4) particle.y = 0
      if (particle.y < 0) particle.y = 4
      if (particle.z < -20) particle.z += 40;
      if (particle.z > 20) particle.z -= 40;

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

    if (matRef.current) {
      if (launching) {
        targetColor.setHSL((state.clock.elapsedTime * 5.0) % 1.0, 1.0, 0.5)
        matRef.current.color.lerp(targetColor, 0.1)
        matRef.current.opacity = THREE.MathUtils.damp(matRef.current.opacity, 0.1, 4, delta)
      } else {
        matRef.current.color.lerp(whiteColor, 0.1)
        const targetOpacity = Math.max(0.01, 0.3 - Math.abs(s.scrollVelocity || 0) * 0.05)
        matRef.current.opacity = THREE.MathUtils.damp(matRef.current.opacity, targetOpacity, 4, delta)
      }
    }
  })

  return (
    <instancedMesh ref={mesh} args={[undefined as any, undefined as any, count]}>
      <sphereGeometry args={[0.005, 8, 8]} />
      <meshBasicMaterial ref={matRef} color="#ffffff" transparent opacity={0.3} depthWrite={false} />
    </instancedMesh>
  )
}

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import * as audio from '../audio'
import { useStore, peek } from '../state'

const COUNT = 2000

export function CyberRain() {
  const rain = useStore((s) => s.rain)
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  
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

  const speeds = useMemo(() => new Float32Array(COUNT).map(() => 5 + Math.random() * 10), [])
  
  const scaleRef = useRef(1.0)

  const targetColor = useMemo(() => new THREE.Color(), [])
  const whiteColor = useMemo(() => new THREE.Color('#ffffff'), [])

  useFrame((state, dt) => {
    if (!rain || !meshRef.current) return
    
    const s = peek()
    scaleRef.current = THREE.MathUtils.damp(scaleRef.current, s.launching ? 40.0 : 1.0, 5, dt)
    
    audio.panRain(state.pointer.x)
    
    for (let i = 0; i < COUNT; i++) {
      let x = positions[i * 3 + 0]
      let y = positions[i * 3 + 1]
      let z = positions[i * 3 + 2]
      
      y -= (speeds[i] + (s.scrollVelocity || 0) * 0.1) * dt
      x += state.pointer.x * 2.0 * dt
      z -= (s.scrollVelocity || 0) * dt * 0.1
      
      if (y < -5) y += 20
      if (z > 20) z -= 40
      if (z < -20) z += 40
      if (x < -10) x += 20
      if (x > 10) x -= 20
      
      positions[i * 3 + 0] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
      
      dummy.position.set(x, y, z)
      dummy.scale.set(1, scaleRef.current, 1)
      
      dummy.rotation.z = state.pointer.x * 0.5
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true

    if (matRef.current) {
      if (s.launching) {
        targetColor.setHSL((state.clock.elapsedTime * 5.0) % 1.0, 1.0, 0.5)
        matRef.current.color.lerp(targetColor, 0.1)
      } else {
        matRef.current.color.lerp(whiteColor, 0.1)
      }
    }
  })
  
  if (!rain) return null
  
  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined as any, undefined as any, COUNT]}>
        <boxGeometry args={[0.01, 0.4, 0.01]} />
        <meshBasicMaterial ref={matRef} color="#ffffff" transparent opacity={0.4} />
      </instancedMesh>
      <RainSplashes />
    </>
  )
}

export function RainSplashes() {
  const rain = useStore((s) => s.rain)
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const data = useMemo(() => Array.from({ length: 500 }, () => ({ x: 0, z: 0, life: 0, scale: 0 })), [])
  const targetColor = useMemo(() => new THREE.Color(), [])
  const whiteColor = useMemo(() => new THREE.Color('#ffffff'), [])

  useFrame((state, dt) => {
    if (!meshRef.current) return
    const launching = peek().launching

    let spawned = 0
    // Spawn new splashes
    for (let i = 0; i < 500 && spawned < (launching ? 15 : 5); i++) {
      if (data[i].life <= 0) {
        data[i].life = 1.0
        data[i].x = (Math.random() - 0.5) * 10
        data[i].z = (Math.random() - 0.5) * 10
        data[i].scale = Math.random() * 0.5 + 0.5
        spawned++
      }
    }

    // Update
    for (let i = 0; i < 500; i++) {
      const d = data[i]
      if (d.life <= 0) {
        dummy.position.set(0, -100, 0)
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(i, dummy.matrix)
        continue
      }

      d.life -= dt * 4.0
      d.scale += dt * (launching ? 15.0 : 5.0)
      
      dummy.position.set(d.x, 0.01, d.z)
      dummy.scale.set(d.scale, d.scale, d.scale)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true

    if (matRef.current) {
      if (launching) {
        targetColor.setHSL((state.clock.elapsedTime * 5.0) % 1.0, 1.0, 0.5)
        matRef.current.color.lerp(targetColor, 0.1)
      } else {
        matRef.current.color.lerp(whiteColor, 0.1)
      }
    }
  })

  if (!rain) return null

  return (
    <instancedMesh ref={meshRef} args={[undefined as any, undefined as any, 500]}>
      <boxGeometry args={[0.02, 0.02, 0.02]} />
      <meshBasicMaterial ref={matRef} color="#ffffff" transparent depthWrite={false} />
    </instancedMesh>
  )
}

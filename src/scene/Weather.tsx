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
  const rotRef = useRef(0)

  const targetColor = useMemo(() => new THREE.Color(), [])
  const whiteColor = useMemo(() => new THREE.Color('#ffffff'), [])

  useFrame((state, dt) => {
    if (!rain || !meshRef.current) return
    
    const s = peek()
    scaleRef.current = THREE.MathUtils.damp(scaleRef.current, s.launching ? 40.0 : 1.0, 5, dt)
    rotRef.current = THREE.MathUtils.damp(rotRef.current, state.pointer.x * 0.5, 4, dt)
    
    audio.panRain(state.pointer.x)
    audio.updateRain(s.scrollVelocity || 0)
    
    for (let i = 0; i < COUNT; i++) {
      let x = positions[i * 3 + 0]
      let y = positions[i * 3 + 1]
      let z = positions[i * 3 + 2]
      
      const launchDeflect = s.launching ? speeds[i] * 5.0 * dt : 0
      const aerodynamicCurve = Math.sin(x * 0.5) * Math.abs(state.pointer.x) * 5.0 * dt
      
      y -= (speeds[i] + (s.scrollVelocity || 0) * 0.5) * dt - launchDeflect
      x += state.pointer.x * 2.0 * dt
      z -= ((s.scrollVelocity || 0) * dt * 0.3) - aerodynamicCurve
      
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
      
      dummy.rotation.z = rotRef.current
      const pitchRef = (s.scrollVelocity || 0) * 0.005
      dummy.rotation.x = pitchRef
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    
    // Dynamically render more rain particles when moving fast!
    const baseCount = 200
    const velCount = Math.abs(s.scrollVelocity || 0) * 0.15
    meshRef.current.count = Math.min(COUNT, Math.floor(baseCount + velCount))
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
    const spawnTarget = (launching ? 15 : 5) + Math.floor(Math.abs(peek().scrollVelocity || 0) * 0.05)
    // Spawn new splashes
    for (let i = 0; i < 500 && spawned < spawnTarget; i++) {
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
      
      const scrollVel = peek().scrollVelocity || 0
      dummy.position.set(d.x, 0.01, d.z)
      dummy.scale.set(d.scale, d.scale, d.scale + Math.abs(scrollVel) * 0.05)
      dummy.rotation.x = -Math.PI / 2
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
      <circleGeometry args={[0.05, 8]} />
      <meshBasicMaterial ref={matRef} color="#ffffff" transparent opacity={0.5} depthWrite={false} />
    </instancedMesh>
  )
}

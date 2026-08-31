import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useStore, peek } from '../state'

function ThrusterFlames() {
  const mesh1 = useRef<THREE.Mesh>(null!)
  const mesh2 = useRef<THREE.Mesh>(null!)
  const matRef = useRef<THREE.MeshBasicMaterial>(null!)
  const matRef2 = useRef<THREE.MeshBasicMaterial>(null!)
  const launching = useStore(s => s.launching)
  const ltRef = useRef(0)

  const targetColor = useMemo(() => new THREE.Color(), [])
  const cyanColor = useMemo(() => new THREE.Color('#00ffff'), [])

  useFrame((state, dt) => {
    if (matRef.current) {
      if (peek().launching) {
        targetColor.setHSL((state.clock.elapsedTime * 5.0) % 1.0, 1.0, 0.5)
        matRef.current.color.lerp(targetColor, 0.1)
      } else {
        matRef.current.color.lerp(cyanColor, 0.1)
      }
      
      // Sync the second mesh's material color if it's separate
      if (mesh2.current && mesh2.current.material && mesh2.current.material !== matRef.current) {
        (mesh2.current.material as THREE.MeshBasicMaterial).color.copy(matRef.current.color)
      }
    }

    if (!launching) {
      ltRef.current = 0
      if (mesh1.current) mesh1.current.visible = false
      if (mesh2.current) mesh2.current.visible = false
      return
    }

    ltRef.current += dt
    const lt = ltRef.current

    if (lt <= 1.0) {
      if (mesh1.current) mesh1.current.visible = false
      if (mesh2.current) mesh2.current.visible = false
      return
    }

    if (!mesh1.current || !mesh2.current) return

    mesh1.current.visible = true
    mesh2.current.visible = true

    const drive = Math.pow(lt - 1.0, 3) * 60.0
    
    const x = drive - 2.4
    mesh1.current.position.set(x, 0.5, 0.6)
    mesh2.current.position.set(x, 0.5, -0.6)

    const velSurge = 1.0 + Math.max(0, peek().scrollVelocity || 0) * 0.05 // Only surge on acceleration
    const t = state.clock.elapsedTime
    
    // X scale is width, Y scale is length due to cone rotation
    const s1x = (0.8 + Math.sin(t * 80) * 0.2 + Math.cos(t * 43) * 0.2) * velSurge
    const s1y = (0.8 + Math.sin(t * 70) * 0.2 + Math.cos(t * 51) * 0.2) * (1.0 + Math.max(0, peek().scrollVelocity || 0) * 0.02)
    const s2x = (0.8 + Math.sin(t * 85) * 0.2 + Math.cos(t * 40) * 0.2) * velSurge
    const s2y = (0.8 + Math.sin(t * 75) * 0.2 + Math.cos(t * 48) * 0.2) * (1.0 + Math.max(0, peek().scrollVelocity || 0) * 0.02)
    mesh1.current.scale.set(s1x, s1y, s1x)
    mesh2.current.scale.set(s2x, s2y, s2x)
    
    if (matRef.current) {
        matRef.current.opacity = 0.8 + Math.min(0.2, Math.max(0, peek().scrollVelocity || 0) * 0.01)
    }
    if (matRef2.current) {
        matRef2.current.opacity = 0.8 + Math.min(0.2, Math.max(0, peek().scrollVelocity || 0) * 0.01)
    }
  })

  return (
    <group>
      <mesh ref={mesh1} rotation={[0, 0, -Math.PI / 2]} visible={false}>
        <coneGeometry args={[0.2, 1.5, 16]} />
        <meshBasicMaterial ref={matRef} color="#00ffff" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={mesh2} rotation={[0, 0, -Math.PI / 2]} visible={false}>
        <coneGeometry args={[0.2, 1.5, 16]} />
        <meshBasicMaterial ref={matRef2} color="#00ffff" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}

function Shockwave() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null!)
  const launching = useStore(s => s.launching)
  const ltRef = useRef(0)
  const targetColor = useMemo(() => new THREE.Color(), [])

  useFrame((state, dt) => {
    if (!launching) {
      ltRef.current = 0
      if (meshRef.current) meshRef.current.scale.set(1, 1, 1)
      if (materialRef.current) materialRef.current.opacity = 0
      return
    }

    const prevLt = ltRef.current
    ltRef.current += dt
    const lt = ltRef.current

    if (lt < 1.0) {
      if (meshRef.current) meshRef.current.scale.set(1, 1, 1)
      if (materialRef.current) materialRef.current.opacity = 0
      return
    }

    if (meshRef.current && materialRef.current) {
      if (prevLt <= 1.0) {
        meshRef.current.scale.set(1, 1, 1)
        materialRef.current.opacity = 0.8
        meshRef.current.position.set(-2.4, 0.5, 0)
      }
      
      targetColor.setHSL((state.clock.elapsedTime * 5.0) % 1.0, 1.0, 0.5)
      materialRef.current.color.lerp(targetColor, 0.1)

      const velBoost = 60 + Math.abs(peek().scrollVelocity || 0) * 0.5
      const s = THREE.MathUtils.damp(meshRef.current.scale.x, velBoost, 10, dt)
      meshRef.current.scale.set(s, s, s)
      materialRef.current.opacity = THREE.MathUtils.damp(materialRef.current.opacity, 0, 5, dt)
      meshRef.current.rotation.x += dt * (10.0 + Math.abs(peek().scrollVelocity || 0) * 0.5)
    }
  })

  return (
    <mesh ref={meshRef} rotation={[0, Math.PI / 2, 0]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial 
        ref={materialRef} 
        color="#ffffff" 
        transparent 
        opacity={0} 
        depthWrite={false} 
        side={THREE.DoubleSide} 
      />
    </mesh>
  )
}

export function Exhaust() {
  const launching = useStore(s => s.launching)
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const count = 400
  const dummy = useMemo(() => new THREE.Object3D(), [])
  
  // Particle state
  const particles = useMemo(() => {
    return new Array(count).fill(0).map(() => ({
      life: 0,
      maxLife: 0,
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
      scale: 0,
    }))
  }, [count])

  const colorArray = useMemo(() => new Float32Array(count * 3), [count])

  const ltRef = useRef(0)
  
  // Particle colors (yellow -> orange -> red -> black)
  const c1 = useMemo(() => new THREE.Color('#fff200'), []) // bright yellow
  const c2 = useMemo(() => new THREE.Color('#ff4d1c'), []) // orange/red
  const c3 = useMemo(() => new THREE.Color('#110000'), []) // dark/black
  const tempColor = useMemo(() => new THREE.Color(), [])

  useFrame((_, dt) => {
    if (!launching) {
      ltRef.current = 0
      return
    }
    
    ltRef.current += dt
    const lt = ltRef.current
    
    let drive = 0
    if (lt > 1.0) {
      drive = Math.pow(lt - 1.0, 3) * 60.0
    }
    
    if (!meshRef.current) return

    // Spawn new particles
    let toSpawn = Math.floor(dt * 200) // basic spawn rate during rumble
    // Increase spawn rate when blasting off + scroll velocity boost
    if (lt > 1.0) toSpawn = Math.floor(dt * (800 + Math.abs(peek().scrollVelocity || 0) * 10))

    for (let i = 0; i < count; i++) {
      const p = particles[i]
      if (p.life <= 0 && toSpawn > 0) {
        // Spawn
        toSpawn--
        p.life = 1.0
        p.maxLife = 0.3 + Math.abs(Math.sin(i * 13)) * 0.4
        p.x = drive - 2.4
        p.y = 0.5 + Math.sin(i * 37) * 0.2
        p.z = Math.cos(i * 41) * 0.4
        
        if (lt < 1.0) {
          p.vx = -4 - Math.abs(Math.sin(i * 17)) * 8
        } else {
          p.vx = -15 - Math.abs(Math.sin(i * 17)) * 25 - Math.abs(peek().scrollVelocity || 0) * 0.3
        }
        
        p.vy = Math.sin(i * 53) * 2 + 1.0
        p.vz = Math.cos(i * 53) * 2
        
        p.scale = 0.4 + Math.abs(Math.sin(i * 61)) * 0.6
      }

      // Update particle
      if (p.life > 0) {
        p.life -= dt / p.maxLife
        
        if (p.life > 0) {
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.z += p.vz * dt
          
          // Drag
          p.vx *= 0.95
          p.vy *= 0.95
          p.vz *= 0.95

          const currentScale = p.scale * Math.pow(p.life, 0.5)
          
          dummy.position.set(p.x, p.y, p.z)
          dummy.scale.set(currentScale, currentScale, currentScale)
          
          // Random rotation
          dummy.rotation.x += dt * 5
          dummy.rotation.y += dt * 5
          
          dummy.updateMatrix()
          meshRef.current.setMatrixAt(i, dummy.matrix)

          const t = 1.0 - p.life
          
          if (t < 0.3) {
            tempColor.lerpColors(c1, c2, t / 0.3)
          } else {
            tempColor.lerpColors(c2, c3, (t - 0.3) / 0.7)
          }

          colorArray[i * 3 + 0] = tempColor.r
          colorArray[i * 3 + 1] = tempColor.g
          colorArray[i * 3 + 2] = tempColor.b
        } else {
          // Hide
          dummy.scale.set(0, 0, 0)
          dummy.updateMatrix()
          meshRef.current.setMatrixAt(i, dummy.matrix)
        }
      }
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  })

  if (!launching) return null

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <dodecahedronGeometry args={[0.3, 0]}>
          <instancedBufferAttribute attach="attributes-color" args={[colorArray, 3]} />
        </dodecahedronGeometry>
        <meshBasicMaterial 
          vertexColors 
          toneMapped={false} 
          transparent 
          opacity={0.8} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false} 
        />
      </instancedMesh>
      <ThrusterFlames />
      <Shockwave />
    </group>
  )
}

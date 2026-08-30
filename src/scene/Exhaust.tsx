import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../state'

function ThrusterFlames() {
  const mesh1 = useRef<THREE.Mesh>(null!)
  const mesh2 = useRef<THREE.Mesh>(null!)
  const launching = useStore(s => s.launching)
  const ltRef = useRef(0)

  useFrame((_, dt) => {
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

    const s1x = 0.8 + Math.random() * 0.4
    const s1y = 0.8 + Math.random() * 0.4
    const s2x = 0.8 + Math.random() * 0.4
    const s2y = 0.8 + Math.random() * 0.4
    mesh1.current.scale.set(s1x, s1y, 1)
    mesh2.current.scale.set(s2x, s2y, 1)
  })

  return (
    <group>
      <mesh ref={mesh1} rotation={[0, 0, -Math.PI / 2]} visible={false}>
        <coneGeometry args={[0.2, 1.5, 16]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={mesh2} rotation={[0, 0, -Math.PI / 2]} visible={false}>
        <coneGeometry args={[0.2, 1.5, 16]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
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
    // Increase spawn rate when blasting off
    if (lt > 1.0) toSpawn = Math.floor(dt * 800)

    for (let i = 0; i < count; i++) {
      const p = particles[i]
      if (p.life <= 0 && toSpawn > 0) {
        // Spawn
        toSpawn--
        p.life = 1.0
        p.maxLife = 0.3 + Math.random() * 0.4 // shorter life
        
        // Spawn at rear of car (x = -2.4 + drive, y = 0.5, z = 0)
        p.x = drive - 2.4
        p.y = 0.5 + (Math.random() - 0.5) * 0.2
        p.z = (Math.random() - 0.5) * 0.4
        
        // Velocity (trail backwards)
        // Car moving +X, so exhaust goes -X
        if (lt < 1.0) {
          p.vx = -4 - Math.random() * 8
        } else {
          p.vx = -15 - Math.random() * 25 // faster blast
        }
        
        p.vy = (Math.random() - 0.5) * 4 + 1.0 // slight upward drift
        p.vz = (Math.random() - 0.5) * 4
        
        p.scale = 0.4 + Math.random() * 0.6
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
    </group>
  )
}

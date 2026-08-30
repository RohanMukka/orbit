import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../state'

export function Hyperspace() {
  const launching = useStore(s => s.launching)
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const count = 1500
  const dummy = useMemo(() => new THREE.Object3D(), [])
  
  const data = useMemo(() => {
    const arr = []
    const color = new THREE.Color()
    for (let i = 0; i < count; i++) {
      const x = Math.random() * 800
      const theta = Math.random() * Math.PI * 2
      // Tunnel radius from 3 to 15
      const r = 3 + Math.random() * 12
      const y = Math.sin(theta) * r
      const z = Math.cos(theta) * r
      
      const p = Math.random()
      if (p < 0.33) color.set('#00ffff')
      else if (p < 0.66) color.set('#ff00ff')
      else color.set('#ff4d1c')
      
      const length = 2 + Math.random() * 8
      
      arr.push({ x, y, z, length, r: color.r, g: color.g, b: color.b })
    }
    return arr
  }, [count])
  
  const colorArray = useMemo(() => {
    const arr = new Float32Array(count * 3)
    data.forEach((d, i) => {
      arr[i * 3 + 0] = d.r
      arr[i * 3 + 1] = d.g
      arr[i * 3 + 2] = d.b
    })
    return arr
  }, [data, count])

  const ltRef = useRef(0)

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
    
    data.forEach((d, i) => {
      // Wrap lines relative to car's drive position
      let offset = (d.x - drive) % 800
      if (offset < -100) offset += 800
      if (offset > 700) offset -= 800
      
      dummy.position.set(drive + offset, d.y + 0.68, d.z)
      // Stretch the lines as speed increases
      const stretch = d.length + (lt > 1 ? (lt - 1) * 40 : 0)
      dummy.scale.set(stretch, 0.05, 0.05)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  if (!launching) return null

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]}>
        <instancedBufferAttribute attach="attributes-color" args={[colorArray, 3]} />
      </boxGeometry>
      <meshBasicMaterial vertexColors toneMapped={false} transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
    </instancedMesh>
  )
}

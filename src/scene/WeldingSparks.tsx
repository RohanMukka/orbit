import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../state'

export function WeldingSparks() {
  const dragging = useStore((s) => s.dragging)
  const COUNT = 200
  const mesh = useRef<THREE.InstancedMesh>(null)

  const particles = useMemo(() => {
    return Array.from({ length: COUNT }, () => ({
      life: 0,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
    }))
  }, [])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  const alive = useRef(0)

  useFrame((_, delta) => {
    if (!mesh.current) return
    // Sparks only spawn while a curve handle is being dragged. Without this the
    // whole pool was stepped and re-uploaded every frame to animate nothing.
    if (!dragging && alive.current === 0) return
    let live = 0

    for (let i = 0; i < COUNT; i++) {
      const p = particles[i]

      if (p.life <= 0) {
        if (dragging && Math.random() < 0.2) {
          p.life = 0.5 + Math.random() * 0.5
          p.pos.set(
            (Math.random() - 0.5) * 1.5,
            0.8 + Math.random() * 0.4,
            (Math.random() - 0.5) * 3.5
          )
          p.vel.set(
            (Math.random() - 0.5) * 4.0,
            (Math.random() - 0.5) * 2.0,
            (Math.random() - 0.5) * 4.0
          )
        }
      }

      if (p.life > 0) {
        live++
        p.life -= delta * 1.5
        p.vel.y -= delta * 5.0 // gravity

        p.pos.addScaledVector(p.vel, delta)
        
        dummy.position.copy(p.pos)
        const s = Math.max(0, p.life)
        dummy.scale.set(s, s, s)
        dummy.updateMatrix()
        mesh.current.setMatrixAt(i, dummy.matrix)
      } else {
        dummy.scale.set(0, 0, 0)
        dummy.updateMatrix()
        mesh.current.setMatrixAt(i, dummy.matrix)
      }
    }
    alive.current = live
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[null as any, null as any, COUNT]}>
      <sphereGeometry args={[0.02, 8, 8]} />
      <meshBasicMaterial color="#ffe4a0" toneMapped={false} />
    </instancedMesh>
  )
}

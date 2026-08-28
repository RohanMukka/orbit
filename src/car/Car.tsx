import { useMemo, useRef, type ComponentProps } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { buildBodyGeometry, CAR } from './body'
import { buildTire, buildRim, buildBrake, buildCaliper } from './wheel'
import { buildTailLight, buildHeadLights, buildDucktail, buildMirrors, buildSplitter, buildDiffuser, buildCanopyTrim, buildIntakeTrim, AXLES } from './parts'
import { useStore, peek, type ViewMode } from '../state'

const FINISH = {
  gloss: { metalness: 0.6, roughness: 0.21, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.4 },
  satin: { metalness: 0.5, roughness: 0.44, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.25 },
  chrome: { metalness: 1, roughness: 0.045, clearcoat: 1, clearcoatRoughness: 0.02, sheen: 0 },
} as const

/** Clay and blueprint passes share one material, so the shell's three groups collapse. */
function StudyMaterial({ view, tint = '#8d939c' }: { view: ViewMode; tint?: string }) {
  if (view === 'wire') {
    return <meshBasicMaterial color="#6ee7ff" wireframe transparent opacity={0.32} toneMapped={false} />
  }
  return <meshStandardMaterial color={tint} roughness={0.78} metalness={0.02} envMapIntensity={0.35} />
}

function Wheel({ x, z, width, front }: { x: number; z: number; width: number; front: boolean }) {
  const rim = useStore((s) => s.rim)
  const view = useStore((s) => s.view)
  const group = useRef<THREE.Group>(null!)
  const tire = useMemo(() => buildTire(width), [width])
  const rimGeo = useMemo(() => buildRim(width), [width])
  const brake = useMemo(() => buildBrake(), [])
  const caliper = useMemo(() => buildCaliper(), [])
  const side = Math.sign(z)
  const study = view !== 'render'

  useFrame((_, dt) => {
    const s = peek()
    const target = s.spin ? 5.4 : 0
    group.current.userData.v = THREE.MathUtils.damp(group.current.userData.v ?? 0, target, 1.6, dt)
    group.current.rotation.z -= group.current.userData.v * dt
  })

  return (
    <group position={[x, CAR.wheelRadius, z]} rotation={[0, front ? -0.06 * side : 0, 0]}>
      <group ref={group} scale={[1, 1, side]}>
        <mesh geometry={tire} castShadow>
          {study ? (
            <StudyMaterial view={view} tint="#6b7078" />
          ) : (
            <meshStandardMaterial color="#0a0a0c" roughness={0.82} metalness={0.05} />
          )}
        </mesh>
        <mesh geometry={rimGeo} castShadow>
          {study ? (
            <StudyMaterial view={view} />
          ) : (
            <meshStandardMaterial color={rim.color} metalness={rim.metal} roughness={rim.rough} envMapIntensity={1.5} />
          )}
        </mesh>
        {!study && (
          <mesh geometry={brake}>
            <meshStandardMaterial color="#191a1f" metalness={0.9} roughness={0.28} />
          </mesh>
        )}
      </group>
      {!study && (
        <mesh geometry={caliper} position={[0, 0, -side * width * 0.16]}>
          <meshStandardMaterial color="#ff4d1c" emissive="#ff2d00" emissiveIntensity={0.25} roughness={0.4} />
        </mesh>
      )}
    </group>
  )
}

export function Car(props: ComponentProps<'group'>) {
  const paint = useStore((s) => s.paint)
  const night = useStore((s) => s.night)
  const view = useStore((s) => s.view)
  const study = view !== 'render'

  const body = useMemo(() => buildBodyGeometry(), [])
  const wireBody = useMemo(() => buildBodyGeometry(60, 40), [])
  const tail = useMemo(() => buildTailLight(), [])
  const head = useMemo(() => buildHeadLights(), [])
  const ducktail = useMemo(() => buildDucktail(), [])
  const mirrors = useMemo(() => buildMirrors(), [])
  const splitter = useMemo(() => buildSplitter(), [])
  const diffuser = useMemo(() => buildDiffuser(), [])
  const canopyTrim = useMemo(() => buildCanopyTrim(), [])
  const intakeTrim = useMemo(() => buildIntakeTrim(), [])

  const f = FINISH[paint.finish]
  const lightRef = useRef<THREE.Group>(null!)

  useFrame((_, dt) => {
    const t = peek().night ? 1 : 0.12
    const g = lightRef.current
    g.userData.i = THREE.MathUtils.damp(g.userData.i ?? 0.12, t, 3, dt)
    g.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
      if (m && 'emissiveIntensity' in m) m.emissiveIntensity = 0.3 + g.userData.i * 5.5
    })
  })

  return (
    <group {...props}>
      {/* Shell: one lofted mesh, three material groups (paint / glass / carbon) */}
      <mesh geometry={view === 'wire' ? wireBody : body} castShadow={!study} receiveShadow={!study}>
        {study ? (
          <StudyMaterial view={view} />
        ) : (
          <>
            <meshPhysicalMaterial
              attach="material-0"
              color={paint.color}
              metalness={f.metalness}
              roughness={f.roughness}
              clearcoat={f.clearcoat}
              clearcoatRoughness={f.clearcoatRoughness}
              sheen={f.sheen}
              sheenColor={paint.flake}
              sheenRoughness={0.5}
              envMapIntensity={1.35}
            />
            {/* Blackout canopy: opaque, so it reads by reflection alone —
                a transparent one would look straight through the shell. */}
            <meshPhysicalMaterial
              attach="material-1"
              color="#05070d"
              metalness={0.28}
              roughness={0.035}
              clearcoat={1}
              clearcoatRoughness={0.02}
              envMapIntensity={2.4}
            />
            <meshPhysicalMaterial
              attach="material-2"
              color="#0c0d10"
              metalness={0.45}
              roughness={0.44}
              clearcoat={0.7}
              clearcoatRoughness={0.35}
              envMapIntensity={0.9}
            />
          </>
        )}
      </mesh>

      <mesh geometry={ducktail} castShadow={!study}>
        {study ? <StudyMaterial view={view} /> : <meshPhysicalMaterial color="#0c0d10" metalness={0.45} roughness={0.4} clearcoat={0.7} />}
      </mesh>
      <mesh geometry={mirrors} castShadow={!study}>
        {study ? <StudyMaterial view={view} /> : <meshPhysicalMaterial color="#0c0d10" metalness={0.5} roughness={0.35} clearcoat={0.8} />}
      </mesh>
      {!study && (
        <>
          <mesh geometry={canopyTrim}>
            <meshStandardMaterial color="#0a0b0e" metalness={0.6} roughness={0.32} />
          </mesh>
          <mesh geometry={intakeTrim}>
            <meshStandardMaterial color="#0a0b0e" metalness={0.6} roughness={0.32} />
          </mesh>
        </>
      )}
      <mesh geometry={splitter} castShadow={!study}>
        {study ? <StudyMaterial view={view} /> : <meshPhysicalMaterial color="#0b0c0f" metalness={0.4} roughness={0.45} clearcoat={0.6} />}
      </mesh>
      <mesh geometry={diffuser} castShadow={!study}>
        {study ? <StudyMaterial view={view} /> : <meshPhysicalMaterial color="#0b0c0f" metalness={0.4} roughness={0.45} clearcoat={0.6} />}
      </mesh>

      <group ref={lightRef} visible={!study}>
        <mesh geometry={head}>
          <meshStandardMaterial color="#ffffff" emissive="#e6efff" emissiveIntensity={0.5} toneMapped={false} />
        </mesh>
        <mesh geometry={tail}>
          <meshStandardMaterial color="#ff2a12" emissive="#ff2a12" emissiveIntensity={0.5} toneMapped={false} />
        </mesh>
      </group>

      {night && !study && (
        <>
          <spotLight position={[2.2, 0.68, 0.62]} target-position={[15, -0.6, 2.4]} angle={0.46} penumbra={1} distance={30} intensity={42} color="#cfe0ff" />
          <spotLight position={[2.2, 0.68, -0.62]} target-position={[15, -0.6, -2.4]} angle={0.46} penumbra={1} distance={30} intensity={42} color="#cfe0ff" />
          <pointLight position={[-2.4, 0.8, 0]} distance={4.5} intensity={9} color="#ff2a12" />
        </>
      )}

      {AXLES.map((a) =>
        [1, -1].map((s) => <Wheel key={`${a.x}-${s}`} x={a.x} z={s * a.track} width={a.width} front={a.front} />)
      )}
    </group>
  )
}

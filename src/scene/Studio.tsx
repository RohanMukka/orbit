import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer, MeshReflectorMaterial, ContactShadows } from '@react-three/drei'
import { useStore, peek } from '../state'

/** Dark gradient dome — cheaper and cleaner than an HDRI, and ships with zero assets. */
function Backdrop() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color('#0a0c12') },
          uBottom: { value: new THREE.Color('#000000') },
          uGlow: { value: new THREE.Color('#1b2432') },
          uNight: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vPos;
          uniform vec3 uTop; uniform vec3 uBottom; uniform vec3 uGlow; uniform float uNight;
          void main() {
            vec3 n = normalize(vPos);
            float h = smoothstep(-0.35, 0.75, n.y);
            vec3 col = mix(uBottom, uTop, h);
            // soft horizon bloom behind the car
            float halo = pow(max(0.0, 1.0 - abs(n.y + 0.02) * 3.4), 3.0);
            col += uGlow * halo * (0.5 - uNight * 0.32);
            col *= 1.0 - uNight * 0.45;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    []
  )

  useFrame((_, dt) => {
    const u = material.uniforms.uNight
    u.value = THREE.MathUtils.damp(u.value, peek().night ? 1 : 0, 2.4, dt)
  })

  return (
    <mesh material={material} scale={60}>
      <sphereGeometry args={[1, 32, 32]} />
    </mesh>
  )
}

/** The long softbox strips that draw highlight streaks down the bodywork. */
function StudioRig() {
  const night = useStore((s) => s.night)
  const chapter = useStore((s) => s.chapter)
  const k = night ? 0.22 : 1 // kill the studio when the headlights come up
  const group = useRef<THREE.Group>(null!)

  /**
   * The rig only turns during the Light chapter, and damps back to rest after
   * it. Re-rendering the cubemap outside that window is six scene renders a
   * frame for a picture that cannot change — so hold it live while the lights
   * move, then drop to a single capture. Switching `frames` back to 1 re-runs
   * drei's layout effect, which takes one last render at the settled rotation.
   */
  const turning = chapter === 2
  const [live, setLive] = useState(false)
  useEffect(() => {
    if (turning) {
      setLive(true)
      return
    }
    const t = setTimeout(() => setLive(false), 2600) // outlast the damp
    return () => clearTimeout(t)
  }, [turning])

  useFrame((state, dt) => {
    const s = peek()
    const target = s.chapter === 2 ? state.clock.elapsedTime * 0.22 : 0
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, target, 1.2, dt)
  })

  return (
    <Environment resolution={256} frames={live ? Infinity : 1}>
      <color attach="background" args={['#04050a']} />
      <group ref={group}>
        <Lightformer form="rect" intensity={2.1 * k} position={[0, 6.6, 0]} scale={[10, 4.2, 1]} rotation={[Math.PI / 2, 0, 0]} color="#ffffff" />
        <Lightformer form="rect" intensity={6 * k} position={[0, 3.1, 4.2]} scale={[10, 0.2, 1]} rotation={[0, 0, 0]} target={[0, 0, 0]} color="#eef4ff" />
        <Lightformer form="rect" intensity={6 * k} position={[0, 3.1, -4.2]} scale={[10, 0.2, 1]} target={[0, 0, 0]} color="#eef4ff" />
        <Lightformer form="rect" intensity={4.2 * k} position={[6.4, 2, 2]} scale={[2.6, 3.4, 1]} target={[0, 0, 0]} color="#ffb28a" />
        <Lightformer form="rect" intensity={(night ? 2.4 : 4) * 1} position={[-7, 2.4, -3]} scale={[4, 4, 1]} target={[0, 0, 0]} color="#7fb6ff" />
        <Lightformer form="ring" intensity={3 * k} position={[-4, 1, 6]} scale={3} target={[0, 0, 0]} color="#ffffff" />
        {/* fill for the rear three-quarter shot, where the deck would go flat */}
        <Lightformer form="rect" intensity={3.4 * k} position={[-5, 3, 5]} scale={[4, 2.4, 1]} target={[0, 0, 0]} color="#dce8ff" />
      </group>
    </Environment>
  )
}

function Floor() {
  const night = useStore((s) => s.night)
  const view = useStore((s) => s.view)
  const exploded = useStore((s) => s.exploded)
  const showGrid = view === 'wire' || exploded

  const gridRef = useRef<THREE.GridHelper>(null)
  const targetColor = useMemo(() => new THREE.Color(), [])
  const whiteColor = useMemo(() => new THREE.Color('#ffffff'), [])

  useFrame((state, dt) => {
    const launching = peek().launching
    if (launching && gridRef.current) {
      gridRef.current.position.x -= dt * 60.0
      if (gridRef.current.position.x < -1.0) {
        gridRef.current.position.x = (gridRef.current.position.x % 1.0)
      }
      const mat = gridRef.current.material as THREE.LineBasicMaterial
      targetColor.setHSL((state.clock.elapsedTime * 5.0) % 1.0, 1.0, 0.5)
      mat.color.lerp(targetColor, 0.1)
    } else if (gridRef.current) {
      gridRef.current.position.x -= (peek().scrollVelocity || 0) * dt * 0.1
      if (gridRef.current.position.x < -1.0) gridRef.current.position.x = (gridRef.current.position.x % 1.0)
      if (gridRef.current.position.x > 1.0) gridRef.current.position.x = (gridRef.current.position.x % 1.0)
      const mat = gridRef.current.material as THREE.LineBasicMaterial
      mat.color.lerp(whiteColor, 0.1)
    }
  })

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[26, 96]} />
        <MeshReflectorMaterial
          resolution={512}
          mixBlur={1.1}
          mixStrength={22}
          blur={[280, 90]}
          mirror={night ? 0.75 : 0.55}
          depthScale={1.1}
          minDepthThreshold={0.35}
          maxDepthThreshold={1.4}
          depthToBlurRatioBias={0.3}
          color="#08090c"
          metalness={0.78}
          roughness={0.55}
        />
      </mesh>
      {showGrid && (
        <gridHelper ref={gridRef} args={[100, 100, '#00e5ff', '#004a52']} position={[0, 0.01, 0]} />
      )}
    </group>
  )
}

import { CAR, shapedProfiles } from '../car/body'

/** Aerodynamic wind tunnel particles tracing the generated splines. */
function Streaks() {
  const night = useStore((s) => s.night)
  const ref = useRef<THREE.InstancedMesh>(null!)
  const streakMatRef = useRef<THREE.MeshBasicMaterial>(null!)
  const seeds = useMemo(
    () =>
      Array.from({ length: 150 }, () => ({
        z: (Math.random() - 0.5) * 4,
        y: Math.random() * 1.5,
        speed: 12 + Math.random() * 15,
        len: 1 + Math.random() * 3,
        offset: Math.random() * 60,
      })),
    []
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const targetColor = useMemo(() => new THREE.Color(), [])
  const streakBaseColor = useMemo(() => new THREE.Color('#9db4ff'), [])

  useFrame((state, dt) => {
    if (!ref.current) return
    const s = peek()
    const launching = s.launching
    const P = shapedProfiles(s.shape)
    const halfLen = CAR.length / 2

    seeds.forEach((seed, i) => {
      seed.offset += seed.speed * (launching ? 15.0 : 1.0) * dt
      const x = (seed.offset % 20) - 10
      let y = seed.y
      let z = seed.z + (state.pointer.x * seed.speed * 0.1)

      if (x > -halfLen && x < halfLen) {
         const u = x / CAR.length + 0.5
         const hw = P.halfWidth.at(u)
         const roof = P.roof.at(u)
         
         if (Math.abs(z) < hw + 0.1 && y < roof + 0.1) {
             const pushOutZ = (hw + 0.1 - Math.abs(z)) * Math.sign(z)
             const pushOutY = (roof + 0.1 - y)
             if (Math.abs(z) > hw * 0.6) z += pushOutZ * 0.9
             else y += pushOutY * 0.9
         }
      }

      dummy.position.set(-x, y, z)
      // Since it's not rotated, plane is in XY. Make it scale in X.
      dummy.scale.set(seed.len * (launching ? 15.0 : 1.0), 0.015, 1)
      dummy.rotation.z = state.pointer.x * 0.1
      dummy.rotation.y = (peek().scrollVelocity || 0) * 0.005
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (streakMatRef.current) {
      if (launching) {
        targetColor.setHSL((state.clock.elapsedTime * 5.0) % 1.0, 1.0, 0.5)
        streakMatRef.current.color.lerp(targetColor, 0.1)
      } else {
        streakMatRef.current.color.lerp(streakBaseColor, 0.1)
      }
    }
  })

  if (!night) return null
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, seeds.length]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial ref={streakMatRef} color="#9db4ff" transparent opacity={0.45} toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
    </instancedMesh>
  )
}

function KeyLight() {
  const night = useStore((s) => s.night)
  return (
    <directionalLight
      position={[4, 8, 3]}
      intensity={night ? 0.25 : 1.4}
      castShadow
      shadow-mapSize={[1024, 1024]}
      shadow-bias={-0.0005}
    >
      <orthographicCamera attach="shadow-camera" args={[-5, 5, 5, -5, 0.1, 25]} />
    </directionalLight>
  )
}

/**
 * The paint chapter was the darkest screen on the site, which is the wrong way
 * round — it is the one asking you to look at colour. Lift the exposure while
 * it is up, and a little at night so the tail bar has some room.
 */
function Exposure() {
  useFrame((state, dt) => {
    const c = peek().chapter
    const target = c === 3 ? 1.16 : c === 4 ? 1.06 : 1.0
    const gl = state.gl
    gl.toneMappingExposure = THREE.MathUtils.damp(gl.toneMappingExposure, target, 2.2, dt)
  })
  return null
}

function CursorLight() {
  const ref = useRef<THREE.SpotLight>(null!)
  
  useFrame((state, dt) => {
    if (!ref.current) return
    const targetX = state.pointer.x * 5
    const targetY = 2 + state.pointer.y * 2
    
    ref.current.position.x = THREE.MathUtils.damp(ref.current.position.x, targetX, 5, dt)
    ref.current.position.y = THREE.MathUtils.damp(ref.current.position.y, targetY, 5, dt)
  })
  
  return (
    <spotLight ref={ref} position={[0, 2, 4]} intensity={2} distance={10} penumbra={1} angle={0.5} color="#ffffff" />
  )
}

export function Studio() {
  return (
    <>
      <Exposure />
      <Backdrop />
      <StudioRig />
      <Floor />
      <Streaks />
      {/* Soft, broad global illumination cast shadow */}
      <ContactShadows position={[0, 0.002, 0]} opacity={0.65} scale={16} blur={4.5} far={4} resolution={1024} frames={100} color="#000000" />
      {/* Tight, dark ambient occlusion core shadow right under the tires/belly */}
      <ContactShadows position={[0, 0.004, 0]} opacity={0.95} scale={8} blur={1.2} far={1} resolution={1024} frames={100} color="#000205" />
      <KeyLight />
      <CursorLight />
      <ambientLight intensity={0.1} />
    </>
  )
}

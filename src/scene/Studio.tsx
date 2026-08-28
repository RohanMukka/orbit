import { useMemo, useRef } from 'react'
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
  const k = night ? 0.22 : 1 // kill the studio when the headlights come up
  const group = useRef<THREE.Group>(null!)
  useFrame((state, dt) => {
    const s = peek()
    const target = s.chapter === 2 ? state.clock.elapsedTime * 0.22 : 0
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, target, 1.2, dt)
  })

  return (
    <Environment resolution={256} frames={Infinity}>
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
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <circleGeometry args={[26, 96]} />
      <MeshReflectorMaterial
        resolution={1024}
        mixBlur={1.1}
        mixStrength={22}
        blur={[420, 120]}
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
  )
}

/** Light streaks that rush past the car once the lights come on. */
function Streaks() {
  const night = useStore((s) => s.night)
  const ref = useRef<THREE.InstancedMesh>(null!)
  const seeds = useMemo(
    () =>
      Array.from({ length: 26 }, () => ({
        z: (Math.random() - 0.5) * 22,
        y: 0.02 + Math.random() * 0.04,
        speed: 16 + Math.random() * 26,
        len: 3 + Math.random() * 9,
        offset: Math.random() * 60,
      })),
    []
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    seeds.forEach((s, i) => {
      const x = ((s.offset + t * s.speed) % 60) - 30
      dummy.position.set(-x, s.y, s.z)
      dummy.scale.set(s.len, 1, 0.008 + Math.abs(s.z) * 0.0008)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })

  if (!night) return null
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, seeds.length]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color="#9db4ff" transparent opacity={0.3} toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} />
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

export function Studio() {
  return (
    <>
      <Backdrop />
      <StudioRig />
      <Floor />
      <Streaks />
      <ContactShadows position={[0, 0.002, 0]} opacity={0.85} scale={16} blur={2.4} far={4} resolution={512} color="#000000" />
      <KeyLight />
      <ambientLight intensity={0.1} />
    </>
  )
}

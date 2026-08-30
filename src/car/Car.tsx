import { useEffect, useMemo, useRef, type ComponentProps } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { buildBodyGeometry, shapedProfiles, updateBodyPositions, CAR } from './body'
import { buildTire, buildRim, buildBrake, buildCaliper } from './wheel'
import { buildTailLight, buildHeadLights, buildDucktail, buildMirrors, buildSplitter, buildDiffuser, buildCanopyTrim, buildIntakeTrim, buildArchLips, buildHeadLightHousings, buildChassis, AXLES } from './parts'
import { buildProfileCurves, buildSectionRings, buildGroundRule } from './blueprint'
import { useStore, peek, type ViewMode } from '../state'

/**
 * The body sweeps into existence on load rather than arriving whole. The car
 * used to be fully formed before the boot overlay had finished fading, which
 * wasted the one moment that dramatises the premise — nothing was ever seen
 * being generated.
 *
 * A clip plane travelling down the car's length is enough: no geometry is
 * rebuilt, so the sweep costs nothing and cannot desynchronise from the shape.
 */
// The body sweeps into existence on load through a 3-stage animated reveal.
const clip = {}

const FINISH = {
  gloss: { metalness: 0.5, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.01, sheen: 0.1 },
  satin: { metalness: 0.6, roughness: 0.35, clearcoat: 0.1, clearcoatRoughness: 0.3, sheen: 0.1 },
  chrome: { metalness: 1, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.01, sheen: 0 },
} as const

/** Clay and blueprint passes share one material, so the shell's three groups collapse. */
function StudyMaterial({ view, tint = '#8d939c' }: { view: ViewMode; tint?: string }) {
  if (view === 'wire') {
    return <meshBasicMaterial {...clip} color="#6ee7ff" wireframe transparent opacity={0.32} toneMapped={false} />
  }
  return <meshStandardMaterial {...clip} color={tint} roughness={0.78} metalness={0.02} envMapIntensity={0.35} />
}

function Wheel({ x, z, width, front }: { x: number; z: number; width: number; front: boolean }) {
  const rim = useStore((s) => s.rim)
  const view = useStore((s) => s.view)
  const group = useRef<THREE.Group>(null!)
  const offsetRef = useRef<THREE.Group>(null!)
  const tireMatRef = useRef<THREE.MeshStandardMaterial>(null!)
  const tire = useMemo(() => buildTire(width), [width])
  const rimGeo = useMemo(() => buildRim(width), [width])
  const brake = useMemo(() => buildBrake(), [])
  const caliper = useMemo(() => buildCaliper(), [])
  const side = Math.sign(z)
  const study = view !== 'render'

  useFrame((state, dt) => {
    const s = peek()
    let target = s.spin ? 5.4 : 0
    if (s.launching) target = 100.0 // Burnout speeds
    group.current.userData.v = THREE.MathUtils.damp(group.current.userData.v ?? 0, target, 1.6, dt)
    group.current.rotation.z -= group.current.userData.v * dt

    const targetExploded = s.exploded ? 1 : 0
    offsetRef.current.userData.ex = THREE.MathUtils.damp(offsetRef.current.userData.ex ?? 0, targetExploded, 3, dt)
    const ex = offsetRef.current.userData.ex
    offsetRef.current.position.z = side * ex * 0.8
    offsetRef.current.position.x = Math.sign(x) * ex * 0.6

    // Hovercraft flight mode fold
    const targetFold = s.launching ? (-Math.PI / 2) * side : 0
    offsetRef.current.rotation.x = THREE.MathUtils.damp(offsetRef.current.rotation.x, targetFold, 5, dt)

    const targetSteer = front ? state.pointer.x * -0.5 : 0
    offsetRef.current.rotation.y = THREE.MathUtils.damp(offsetRef.current.rotation.y, targetSteer, 5, dt)

    const targetGlow = s.launching ? 4.0 : 0.0
    if (tireMatRef.current) {
      tireMatRef.current.emissiveIntensity = THREE.MathUtils.damp(tireMatRef.current.emissiveIntensity, targetGlow, 2, dt)
      if (s.launching) {
        tireMatRef.current.emissive.setHSL((state.clock.elapsedTime * 5.0) % 1.0, 1.0, 0.5)
      } else {
        tireMatRef.current.emissive.set('#ff4400')
      }
    }

    const scaleYZ = s.launching ? 1.3 : 1.0
    group.current.scale.y = THREE.MathUtils.damp(group.current.scale.y, scaleYZ, 5, dt)
    group.current.scale.z = THREE.MathUtils.damp(group.current.scale.z, scaleYZ * side, 5, dt)
  })

  return (
    <group position={[x, CAR.wheelRadius, z]} rotation={[0, front ? -0.06 * side : 0, 0]}>
      <group ref={offsetRef}>
      <group ref={group} scale={[1, 1, side]}>
        <mesh geometry={tire} castShadow>
          {study ? (
            <StudyMaterial view={view} tint="#6b7078" />
          ) : (
            <meshStandardMaterial {...clip} ref={tireMatRef} color="#0a0a0c" roughness={0.82} metalness={0.05} emissive="#ff4400" emissiveIntensity={0} />
          )}
        </mesh>
        <mesh geometry={rimGeo} castShadow>
          {study ? (
            <StudyMaterial view={view} />
          ) : (
            <meshStandardMaterial {...clip} color={rim.color} metalness={rim.metal} roughness={rim.rough} envMapIntensity={1.5} emissive={rim.emissive || '#000000'} emissiveIntensity={rim.emissiveIntensity || 0} />
          )}
        </mesh>
        {!study && (
          <mesh geometry={brake}>
            <meshStandardMaterial {...clip} color="#191a1f" metalness={0.9} roughness={0.28} />
          </mesh>
        )}
      </group>
      {!study && (
        <mesh geometry={caliper} position={[0, 0, -side * width * 0.16]}>
          <meshStandardMaterial {...clip} color="#ff4d1c" emissive="#ff2d00" emissiveIntensity={0.25} roughness={0.4} />
        </mesh>
      )}
      </group>
    </group>
  )
}

export function Car(props: ComponentProps<'group'>) {
  const paint = useStore((s) => s.paint)
  const night = useStore((s) => s.night)
  const view = useStore((s) => s.view)
  const study = view !== 'render'

  const shape = useStore((s) => s.shape)
  const dragging = useStore((s) => s.dragging)

  const body = useMemo(() => buildBodyGeometry(), [])
  // A coarser copy carries the drag. Topology is identical, so the material
  // groups still line up and only the vertex count differs.
  const draft = useMemo(() => buildBodyGeometry(132, 76), [])

  useEffect(() => {
    const P = shapedProfiles(shape)
    updateBodyPositions(draft, P, 132, 76)
    if (!dragging) updateBodyPositions(body, P)
  }, [shape, dragging, body, draft])
  const curves = useMemo(() => buildProfileCurves(), [])
  const rings = useMemo(() => buildSectionRings(), [])
  const rule = useMemo(() => buildGroundRule(), [])
  const tail = useMemo(() => buildTailLight(), [])
  const head = useMemo(() => buildHeadLights(), [])
  const headCups = useMemo(() => buildHeadLightHousings(), [])
  const ducktail = useMemo(() => buildDucktail(), [])
  const mirrors = useMemo(() => buildMirrors(), [])
  const splitter = useMemo(() => buildSplitter(), [])
  const diffuser = useMemo(() => buildDiffuser(), [])
  const canopyTrim = useMemo(() => buildCanopyTrim(), [])
  const intakeTrim = useMemo(() => buildIntakeTrim(), [])
  const archLips = useMemo(() => buildArchLips(), [])
  const chassis = useMemo(() => buildChassis(), [])

  const f = FINISH[paint.finish]

  /**
   * Paint is built by hand rather than declared, so the shader can be patched.
   *
   * Panel gaps are the cheapest large gain left on the body: without them the
   * shell reads as one moulded lump. They are drawn from the loft's own (u,
   * theta) parameters rather than a texture — which keeps the site's zero-asset
   * claim intact and is how production real-time car renders do it anyway.
   */
  const paintMat = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({ sheenRoughness: 0.5, envMapIntensity: 1.35, transparent: true })
    // vUv only exists if something asks for it; nothing here samples a texture.
    m.defines = { ...(m.defines ?? {}), USE_UV: '' }
    m.onBeforeCompile = (shader) => {
      shader.fragmentShader = `
        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u = f*f*(3.0-2.0*f);
            return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                       mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
        }
      ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          float gap = 0.0;
          // engine cover, then the cowl ahead of the windscreen
          gap = max(gap, 1.0 - smoothstep(0.0, 0.001, abs(vUv.x - 0.295)));
          gap = max(gap, 1.0 - smoothstep(0.0, 0.001, abs(vUv.x - 0.828)));
          // only across the upper surface, dying before it reaches the shoulders
          float band = smoothstep(0.03, 0.10, vUv.y) * (1.0 - smoothstep(0.40, 0.47, vUv.y));
          diffuseColor.rgb *= 1.0 - 0.82 * gap * band;
        }`
      )
      
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
         float peel = noise(vUv * 2400.0);
         roughnessFactor += peel * 0.05;
        `
      )
      
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_begin>',
        `#include <normal_fragment_begin>
         float n1 = noise(vUv * 3600.0) * 2.0 - 1.0;
         float n2 = noise(vUv * 3600.0 + vec2(5.0)) * 2.0 - 1.0;
         normal = normalize(normal + vec3(n1, n2, 0.0) * 0.015);
        `
      )
    }
    return m
  }, [])

  const glassMat = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      color: '#010203',
      metalness: 0.9,
      roughness: 0.05,
      transmission: 0.0,
      ior: 1.52,
      clearcoat: 1,
      clearcoatRoughness: 0.0,
      envMapIntensity: 2.5,
      transparent: true,
      opacity: 1.0,
    })
    return m
  }, [])

  const carbonMat = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#0c0d10',
      metalness: 0.85,
      roughness: 0.6,
      clearcoat: 0.3,
      envMapIntensity: 0.5,
      transparent: true,
      opacity: 1.0,
    })
  }, [])

  useEffect(() => {
    paintMat.color.set(paint.color)
    paintMat.sheenColor.set(paint.flake)
    paintMat.metalness = f.metalness
    paintMat.roughness = f.roughness
    paintMat.clearcoat = f.clearcoat
    paintMat.clearcoatRoughness = f.clearcoatRoughness
    paintMat.sheen = f.sheen

    if (paint.id === 'cyber') {
      carbonMat.emissive.set('#ff00ff')
      carbonMat.emissiveIntensity = 1
    } else {
      carbonMat.emissive.set('#000000')
      carbonMat.emissiveIntensity = 0
    }
  }, [paintMat, carbonMat, paint, f])
  const blueprint = view === 'wire'
  const headMatRef = useRef<THREE.MeshStandardMaterial>(null!)
  const wireframeMatRef = useRef<THREE.MeshBasicMaterial>(null!)
  const underglowRef = useRef<THREE.RectAreaLight>(null!)
  const headlightsGroupRef = useRef<THREE.Group>(null!)
  const lightRef = useRef<THREE.Group>(null!)
  const shellRef = useRef<THREE.Group>(null!)
  const blueprintRef = useRef<THREE.Group>(null!)
  const groupRef = useRef<THREE.Group>(null!)
  const playedDrop = useRef(false)

  const ducktailRef = useRef<THREE.Mesh>(null!)
  const mirrorsRef = useRef<THREE.Mesh>(null!)
  const archLipsRef = useRef<THREE.Mesh>(null!)
  const splitterRef = useRef<THREE.Mesh>(null!)
  const diffuserRef = useRef<THREE.Mesh>(null!)
  const canopyTrimRef = useRef<THREE.Mesh>(null!)
  const intakeTrimRef = useRef<THREE.Mesh>(null!)
  const headCupsRef = useRef<THREE.Mesh>(null!)

  const revealed = useRef(0)
  const explodedLerp = useRef(0)

  useFrame((_, dt) => {
    const st = peek()
    if (!st.loaded) {
      revealed.current = 0
      playedDrop.current = false
    } else if (revealed.current < 3.2) {
      revealed.current += dt
      const t = revealed.current

      if (t > 2.0 && !playedDrop.current) {
        import('../audio').then(m => m.playDrop())
        playedDrop.current = true
      }

      // Phase 1 (0-1s): Curves only
      // Phase 2 (1-2s): Rings snap in
      // Phase 3 (2-3s): Body fades in, blueprint fades out
      const curvesOpacity = t < 1 ? t : (t < 2 ? 1 : Math.max(0, 3 - t))
      const ringsOpacity = t < 1 ? 0 : (t < 2 ? (t - 1) : Math.max(0, 3 - t))
      const shellOpacity = t < 2 ? 0 : Math.min(1, t - 2)

      if (blueprintRef.current) {
        ;((blueprintRef.current.children[0] as THREE.LineSegments).material as THREE.Material).opacity = ringsOpacity * 0.55
        ;((blueprintRef.current.children[1] as THREE.LineSegments).material as THREE.Material).opacity = ringsOpacity * 0.32
        ;((blueprintRef.current.children[2] as THREE.LineSegments).material as THREE.Material).opacity = curvesOpacity
      }

      if (shellRef.current) {
        shellRef.current.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            const mats = Array.isArray((o as THREE.Mesh).material) ? (o as THREE.Mesh).material as THREE.Material[] : [(o as THREE.Mesh).material as THREE.Material]
            mats.forEach(m => {
              m.transparent = true
              m.opacity = shellOpacity
              m.needsUpdate = true
            })
          }
        })
      }
    }

    const t = st.night ? 1 : 0.12
    const g = lightRef.current
    if (!g) return
    g.userData.i = THREE.MathUtils.damp(g.userData.i ?? 0.12, t, 3, dt)
    g.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
      if (m && 'emissiveIntensity' in m) {
        let e = 0.3 + g.userData.i * 5.5
        if (st.launching) e *= 3.0 // Flare taillights on launch
        e += Math.abs(peek().scrollVelocity || 0) * 0.1 // Kinetic taillight flare
        m.emissiveIntensity = e
      }
    })

    // Cinematic Launch Animation
    if (st.launching && groupRef.current) {
      const group = groupRef.current
      group.userData.launchT = (group.userData.launchT ?? 0) + dt
      const lt = group.userData.launchT
      
      // Rumble phase (0 to 1s)
      if (lt < 1.0) {
        const rumble = lt * 0.12 // Aggressive shake
        group.position.x = (Math.random() - 0.5) * rumble
        group.position.y = (Math.random() - 0.5) * rumble
        group.position.z = (Math.random() - 0.5) * rumble
      } 
      // Blast off phase (>1.0s)
      else {
        // frontAxle is positive X, so +X is front. Blast forward means +X.
        const drive = Math.pow(lt - 1.0, 3) * 60.0
        group.position.x = drive
        group.position.y = 0
        group.position.z = 0
      }
    }

    // Exploded view animation
    const targetExploded = st.exploded ? 1 : 0
    explodedLerp.current = THREE.MathUtils.damp(explodedLerp.current, targetExploded, 3, dt)
    const ex = explodedLerp.current

    if (blueprintRef.current) {
      blueprintRef.current.children[0].scale.setScalar(1 + ex * 0.2) // rings
      blueprintRef.current.children[2].position.y = ex * 0.8 // curves
      
      if (st.view === 'wire' && revealed.current >= 3.0) {
        blueprintRef.current.visible = true
        ;((blueprintRef.current.children[0] as THREE.LineSegments).material as THREE.Material).opacity = 0.55
        ;((blueprintRef.current.children[1] as THREE.LineSegments).material as THREE.Material).opacity = 0.32
        ;((blueprintRef.current.children[2] as THREE.LineSegments).material as THREE.Material).opacity = 1.0
      } else if (ex > 0.01 && revealed.current >= 3.0) {
        blueprintRef.current.visible = true
        ;((blueprintRef.current.children[0] as THREE.LineSegments).material as THREE.Material).opacity = ex * 0.55
        ;((blueprintRef.current.children[1] as THREE.LineSegments).material as THREE.Material).opacity = ex * 0.32
        ;((blueprintRef.current.children[2] as THREE.LineSegments).material as THREE.Material).opacity = ex
      } else if (ex <= 0.01 && revealed.current >= 3.0) {
        blueprintRef.current.visible = false
      }
    }

    if (ducktailRef.current) {
      ducktailRef.current.position.y = ex * 0.4
      ducktailRef.current.position.z = ex * 0.3
    }
    if (mirrorsRef.current) {
      mirrorsRef.current.scale.x = 1 + ex * 0.4
    }
    if (archLipsRef.current) {
      archLipsRef.current.position.y = ex * 0.2
      archLipsRef.current.scale.x = 1 + ex * 0.05
      archLipsRef.current.scale.z = 1 + ex * 0.05
    }
    if (splitterRef.current) {
      splitterRef.current.position.x = ex * 0.6
      splitterRef.current.position.y = ex * -0.1
    }
    if (diffuserRef.current) {
      diffuserRef.current.position.x = ex * -0.6
      diffuserRef.current.position.y = ex * -0.1
    }
    if (canopyTrimRef.current) {
      canopyTrimRef.current.position.y = ex * 0.3
    }
    if (intakeTrimRef.current) {
      intakeTrimRef.current.scale.z = 1 + ex * 0.1
    }
    if (headCupsRef.current) {
      headCupsRef.current.position.x = ex * 0.4
    }
    if (lightRef.current && lightRef.current.children.length >= 2) {
      lightRef.current.children[0].position.x = ex * 0.4
      lightRef.current.children[1].position.x = ex * -0.4
    }

    if (shellRef.current) {
      shellRef.current.position.y = ex * 0.8
      
      if (st.view !== 'wire' && revealed.current >= 3.0) {
        // Ensure shell opacity is restored if we were in blueprint mode
        shellRef.current.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            const mats = Array.isArray((o as THREE.Mesh).material) ? (o as THREE.Mesh).material as THREE.Material[] : [(o as THREE.Mesh).material as THREE.Material]
            mats.forEach(m => {
              m.transparent = true
              m.opacity = 1.0
            })
          }
        })
      }
    }

    if (headlightsGroupRef.current) {
      if (revealed.current < 3.0) {
        headlightsGroupRef.current.visible = Math.random() > 0.5;
      } else {
        if (peek().launching) {
          const on = Math.random() > 0.1;
          headlightsGroupRef.current.visible = on;
          if (headMatRef.current) headMatRef.current.emissiveIntensity = on ? (st.night ? 6.0 : 0.5) : 0;
        } else {
          headlightsGroupRef.current.visible = true;
          if (headMatRef.current) headMatRef.current.emissiveIntensity = st.night ? 6.0 : 0.5;
        }
      }
    }
  })

  // Blueprint always renders during genesis, then only if view === 'wire'
  const showBlueprint = blueprint || revealed.current < 3.0
  const showShell = !blueprint || revealed.current < 3.0

  useFrame((state, dt) => {
    const launching = peek().launching
    if (wireframeMatRef.current) {
      wireframeMatRef.current.opacity = 0.03 + Math.abs(Math.sin(state.clock.elapsedTime * 3.0)) * 0.04
      if (launching) {
        wireframeMatRef.current.color.setHSL((state.clock.elapsedTime * 5.0) % 1.0, 1.0, 0.5)
      } else {
        wireframeMatRef.current.color.set('#00ffcc')
      }
    }
    paintMat.envMapIntensity = 1.35 + Math.sin(state.clock.elapsedTime * 2.0) * 0.4 + Math.abs(peek().scrollVelocity || 0) * 0.02
    glassMat.envMapIntensity = 2.0 + Math.sin(state.clock.elapsedTime * 2.0) * 0.2 + Math.abs(peek().scrollVelocity || 0) * 0.05
    if (launching && groupRef.current) {
      groupRef.current.position.y = (Math.random() - 0.5) * 0.04
      groupRef.current.position.z = (Math.random() - 0.5) * 0.02
    } else if (groupRef.current) {
      groupRef.current.position.y = 0
      groupRef.current.position.z = 0
    }

    if (groupRef.current) {
      const targetPitch = (launching ? 0.05 : 0.0) + (peek().scrollVelocity || 0) * 0.001
      const targetRoll = launching ? 0.05 : (state.pointer.x * 0.02)
      groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, targetPitch, 4, dt)
      groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetRoll, 4, dt)
    }

    if (underglowRef.current) {
      if (launching) {
        underglowRef.current.color.setHSL((state.clock.elapsedTime * 5.0) % 1.0, 1.0, 0.5)
      } else {
        underglowRef.current.color.set('#00e5ff')
      }

      const targetIntensity = launching
        ? Math.random() * 50.0 + 10.0
        : Math.abs(Math.sin(state.clock.elapsedTime * 4.0)) * 5.0 + 5.0
      underglowRef.current.intensity = THREE.MathUtils.damp(
        underglowRef.current.intensity,
        targetIntensity,
        10,
        dt
      )
      underglowRef.current.width = THREE.MathUtils.damp(underglowRef.current.width, launching ? 8.0 : 4.0, 4, dt)
      underglowRef.current.height = THREE.MathUtils.damp(underglowRef.current.height, launching ? 3.0 : 1.0, 4, dt)
    }
  })

  return (
    <group {...props} ref={groupRef}>
      <group ref={headlightsGroupRef}>
        <pointLight position={[3.0, 0.4, 1.2]} intensity={night ? 25 : 0} distance={15} color="#e6f2ff" />
        <pointLight position={[3.0, 0.4, -1.2]} intensity={night ? 25 : 0} distance={15} color="#e6f2ff" />
        <pointLight position={[-2.8, 0.6, 1.0]} intensity={night ? 15 : 0} distance={10} color="#ff0000" />
        <pointLight position={[-2.8, 0.6, -1.0]} intensity={night ? 15 : 0} distance={10} color="#ff0000" />
      </group>
      <rectAreaLight
        ref={underglowRef}
        position={[0, 0.1, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        width={2.0}
        height={4.5}
        intensity={15}
        color={paint.flake}
      />
      <group ref={blueprintRef} visible={showBlueprint}>
        <lineSegments geometry={rings}>
          <lineBasicMaterial color="#2f7d95" transparent opacity={0.55} toneMapped={false} />
        </lineSegments>
        <lineSegments geometry={rule}>
          <lineBasicMaterial color="#2f7d95" transparent opacity={0.32} toneMapped={false} />
        </lineSegments>
        <lineSegments geometry={curves}>
          <lineBasicMaterial color="#9ff2ff" transparent opacity={1} toneMapped={false} />
        </lineSegments>
      </group>

      <mesh geometry={chassis} visible={!blueprint} castShadow={!study}>
        {study ? <StudyMaterial view={view} /> : <meshStandardMaterial color="#0a0b0d" metalness={0.9} roughness={0.4} envMapIntensity={1.2} />}
      </mesh>

      <group ref={shellRef} visible={showShell}>
        <mesh geometry={dragging ? draft : body} castShadow={!study} receiveShadow={!study} material={study ? undefined : [paintMat, glassMat, carbonMat]}>
          {study && <StudyMaterial view={view} />}
        </mesh>
        <mesh geometry={body} visible={!study}>
          <meshBasicMaterial ref={wireframeMatRef} color="#00ffcc" wireframe transparent opacity={0.03} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>

        <mesh geometry={ducktail} castShadow={!study} ref={ducktailRef}>
          {study ? <StudyMaterial view={view} /> : <meshPhysicalMaterial {...clip} transparent color="#0c0d10" metalness={0.45} roughness={0.4} clearcoat={0.7} />}
        </mesh>
        <mesh geometry={mirrors} castShadow={!study} ref={mirrorsRef}>
          {study ? <StudyMaterial view={view} /> : <meshPhysicalMaterial {...clip} transparent color="#0c0d10" metalness={0.5} roughness={0.35} clearcoat={0.8} />}
        </mesh>
        <mesh geometry={archLips} castShadow={!study} ref={archLipsRef}>
          {study ? (
            <StudyMaterial view={view} />
          ) : (
            <meshPhysicalMaterial {...clip}
              transparent
              color={paint.color}
              metalness={f.metalness}
              roughness={f.roughness}
            clearcoat={f.clearcoat}
            clearcoatRoughness={f.clearcoatRoughness}
            envMapIntensity={1.35}
          />
        )}
      </mesh>
      {!study && (
        <>
          <mesh geometry={canopyTrim} ref={canopyTrimRef}>
            <meshStandardMaterial {...clip} color="#0a0b0e" metalness={0.6} roughness={0.32} />
          </mesh>
          <mesh geometry={intakeTrim} ref={intakeTrimRef}>
            <meshStandardMaterial {...clip} color="#0a0b0e" metalness={0.6} roughness={0.32} />
          </mesh>
        </>
      )}
        <mesh geometry={splitter} visible={!blueprint} castShadow={!study} ref={splitterRef}>
          {study ? <StudyMaterial view={view} /> : <meshPhysicalMaterial {...clip} transparent color="#0b0c0f" metalness={0.4} roughness={0.45} clearcoat={0.6} />}
        </mesh>
        <mesh geometry={diffuser} visible={!blueprint} castShadow={!study} ref={diffuserRef}>
          {study ? <StudyMaterial view={view} /> : <meshPhysicalMaterial {...clip} transparent color="#0b0c0f" metalness={0.4} roughness={0.45} clearcoat={0.6} />}
        </mesh>

      {/* Housings sit outside the emissive group so they stay dark. */}
      <mesh geometry={headCups} visible={!study && !blueprint} ref={headCupsRef}>
        <meshStandardMaterial {...clip} color="#050609" metalness={0.5} roughness={0.5} />
      </mesh>

      <group ref={lightRef} visible={!study}>
        <mesh geometry={head}>
          <meshStandardMaterial {...clip} ref={headMatRef} color="#ffffff" emissive="#e6efff" emissiveIntensity={night ? 6.0 : 0.5} toneMapped={false} />
        </mesh>
        <mesh geometry={tail}>
          <meshStandardMaterial {...clip} color="#ff2a12" emissive="#ff2a12" emissiveIntensity={night ? 4.0 : 0.5} toneMapped={false} />
        </mesh>
      </group>

      {night && !study && (
        <>
          <spotLight position={[2.2, 0.68, 0.62]} target-position={[15, -0.6, 2.4]} angle={0.46} penumbra={1} distance={30} intensity={42} color="#cfe0ff" />
          <spotLight position={[2.2, 0.68, -0.62]} target-position={[15, -0.6, -2.4]} angle={0.46} penumbra={1} distance={30} intensity={42} color="#cfe0ff" />
          <pointLight position={[-2.4, 0.8, 0]} distance={4.5} intensity={9} color="#ff2a12" />
        </>
      )}

      <group visible={!blueprint}>
        {AXLES.map((a) =>
          [1, -1].map((s) => <Wheel key={`${a.x}-${s}`} x={a.x} z={s * a.track} width={a.width} front={a.front} />)
        )}
      </group>
      </group>
    </group>
  )
}

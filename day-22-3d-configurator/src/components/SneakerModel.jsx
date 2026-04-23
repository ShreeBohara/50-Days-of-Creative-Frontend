/**
 * SneakerModel.jsx — Stylized sneaker constructed from Three.js primitives
 *
 * Parts: sole, midsole, upper, toe, heel, tongue, laces, logo
 * Each part is a named mesh group that can be individually colored / material-swapped.
 */
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/* ── helpers ── */

/** Create a rounded-box shape via ExtrudeGeometry for organic feel */
function RoundedBox({ width, height, depth, radius = 0.05, ...props }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape()
    const w = width / 2 - radius
    const h = depth / 2 - radius
    s.moveTo(-w, -h)
    s.lineTo(w, -h)
    s.quadraticCurveTo(w + radius, -h, w + radius, -h + radius)
    s.lineTo(w + radius, h)
    s.quadraticCurveTo(w + radius, h + radius, w, h + radius)
    s.lineTo(-w, h + radius)
    s.quadraticCurveTo(-w - radius, h + radius, -w - radius, h)
    s.lineTo(-w - radius, -h + radius)
    s.quadraticCurveTo(-w - radius, -h, -w, -h)
    return s
  }, [width, depth, radius])

  const extrudeSettings = useMemo(
    () => ({ depth: height, bevelEnabled: true, bevelThickness: radius, bevelSize: radius, bevelSegments: 4 }),
    [height, radius],
  )

  return (
    <mesh {...props}>
      <extrudeGeometry args={[shape, extrudeSettings]} />
    </mesh>
  )
}

/* ── default colors for each part ── */
export const DEFAULT_COLORS = {
  sole: '#1a1a1a',
  midsole: '#f0f0f0',
  upper: '#e84545',
  toe: '#c73636',
  heel: '#1a1a1a',
  tongue: '#f0f0f0',
  laces: '#ffffff',
  logo: '#ffd700',
}

export const PART_NAMES = ['sole', 'midsole', 'upper', 'toe', 'heel', 'tongue', 'laces', 'logo']

/* ── main component ── */
export default function SneakerModel({ partColors = DEFAULT_COLORS, partMaterials = {}, selectedPart, onPartClick }) {
  const groupRef = useRef()
  const materialRefs = useRef({})

  /* Slow idle float */
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(Date.now() * 0.001) * 0.04
    }
  })

  /** Build a MeshStandardMaterial with the right roughness/metalness */
  function matProps(partName) {
    const type = partMaterials[partName] || 'matte'
    const base = {
      matte: { roughness: 0.9, metalness: 0.0 },
      glossy: { roughness: 0.15, metalness: 0.1 },
      metallic: { roughness: 0.2, metalness: 0.9 },
    }[type]

    return {
      color: partColors[partName] || DEFAULT_COLORS[partName],
      ...base,
      envMapIntensity: type === 'metallic' ? 1.5 : 0.8,
    }
  }

  function handleClick(e, part) {
    e.stopPropagation()
    onPartClick?.(part)
  }

  /** Highlight emissive when selected */
  function emissive(part) {
    return selectedPart === part ? '#222222' : '#000000'
  }

  return (
    <group ref={groupRef} position={[0, 0, 0]} scale={1}>
      {/* ── Outsole (bottom rubber) ── */}
      <mesh
        position={[0, -0.32, 0.1]}
        castShadow
        onClick={(e) => handleClick(e, 'sole')}
      >
        <boxGeometry args={[1.2, 0.12, 3.0]} />
        <meshStandardMaterial
          {...matProps('sole')}
          emissive={emissive('sole')}
          ref={(el) => { materialRefs.current.sole = el }}
        />
      </mesh>

      {/* ── Midsole ── */}
      <mesh
        position={[0, -0.2, 0.1]}
        castShadow
        onClick={(e) => handleClick(e, 'midsole')}
      >
        <boxGeometry args={[1.15, 0.14, 2.9]} />
        <meshStandardMaterial
          {...matProps('midsole')}
          emissive={emissive('midsole')}
          ref={(el) => { materialRefs.current.midsole = el }}
        />
      </mesh>

      {/* ── Upper body ── */}
      <mesh
        position={[0, 0.05, -0.1]}
        castShadow
        onClick={(e) => handleClick(e, 'upper')}
      >
        <boxGeometry args={[1.05, 0.45, 2.2]} />
        <meshStandardMaterial
          {...matProps('upper')}
          emissive={emissive('upper')}
          ref={(el) => { materialRefs.current.upper = el }}
        />
      </mesh>

      {/* ── Toe box (rounded front) ── */}
      <mesh
        position={[0, -0.05, 1.35]}
        scale={[0.55, 0.35, 0.55]}
        castShadow
        onClick={(e) => handleClick(e, 'toe')}
      >
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial
          {...matProps('toe')}
          emissive={emissive('toe')}
          ref={(el) => { materialRefs.current.toe = el }}
        />
      </mesh>

      {/* ── Heel counter ── */}
      <mesh
        position={[0, 0.1, -1.2]}
        castShadow
        onClick={(e) => handleClick(e, 'heel')}
      >
        <boxGeometry args={[1.0, 0.55, 0.3]} />
        <meshStandardMaterial
          {...matProps('heel')}
          emissive={emissive('heel')}
          ref={(el) => { materialRefs.current.heel = el }}
        />
      </mesh>

      {/* ── Tongue ── */}
      <mesh
        position={[0, 0.4, 0.0]}
        rotation={[0.25, 0, 0]}
        castShadow
        onClick={(e) => handleClick(e, 'tongue')}
      >
        <boxGeometry args={[0.55, 0.06, 1.3]} />
        <meshStandardMaterial
          {...matProps('tongue')}
          emissive={emissive('tongue')}
          ref={(el) => { materialRefs.current.tongue = el }}
        />
      </mesh>

      {/* ── Laces (accent strips across upper) ── */}
      {[-0.3, 0.0, 0.3, 0.55].map((z, i) => (
        <mesh
          key={`lace-${i}`}
          position={[0, 0.3, z]}
          rotation={[0, 0, 0]}
          castShadow
          onClick={(e) => handleClick(e, 'laces')}
        >
          <boxGeometry args={[0.8, 0.04, 0.06]} />
          <meshStandardMaterial
            {...matProps('laces')}
            emissive={emissive('laces')}
            ref={i === 0 ? (el) => { materialRefs.current.laces = el } : undefined}
          />
        </mesh>
      ))}

      {/* ── Logo (side panel decal) ── */}
      {/* Right side */}
      <mesh
        position={[0.54, 0.08, 0.15]}
        rotation={[0, Math.PI / 2, 0]}
        onClick={(e) => handleClick(e, 'logo')}
      >
        <planeGeometry args={[0.9, 0.28]} />
        <meshStandardMaterial
          {...matProps('logo')}
          emissive={emissive('logo')}
          side={THREE.DoubleSide}
          ref={(el) => { materialRefs.current.logo = el }}
        />
      </mesh>
      {/* Left side (mirrored) */}
      <mesh
        position={[-0.54, 0.08, 0.15]}
        rotation={[0, -Math.PI / 2, 0]}
        onClick={(e) => handleClick(e, 'logo')}
      >
        <planeGeometry args={[0.9, 0.28]} />
        <meshStandardMaterial
          {...matProps('logo')}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── Collar / ankle opening rim ── */}
      <mesh position={[0, 0.28, -0.55]}>
        <torusGeometry args={[0.35, 0.04, 8, 24, Math.PI]} />
        <meshStandardMaterial
          color={partColors.upper || DEFAULT_COLORS.upper}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>
    </group>
  )
}

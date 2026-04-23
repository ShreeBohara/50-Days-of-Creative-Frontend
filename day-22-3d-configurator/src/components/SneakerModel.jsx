/**
 * SneakerModel.jsx — Stylized sneaker constructed from Three.js primitives
 *
 * Parts: sole, midsole, upper, toe, heel, tongue, laces, logo
 * Each part is a named mesh that can be individually colored / material-swapped.
 * Colors animate smoothly via useAnimatedColor hook.
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import AnimatedPart from './AnimatedPart'

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

  /* Slow idle float */
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(Date.now() * 0.001) * 0.04
    }
  })

  function handleClick(e, part) {
    e.stopPropagation()
    onPartClick?.(part)
  }

  return (
    <group ref={groupRef} position={[0, 0, 0]} scale={1}>
      {/* ── Outsole (bottom rubber) ── */}
      <AnimatedPart
        partName="sole"
        color={partColors.sole || DEFAULT_COLORS.sole}
        materialType={partMaterials.sole}
        selected={selectedPart === 'sole'}
        onClick={(e) => handleClick(e, 'sole')}
        position={[0, -0.32, 0.1]}
        castShadow
      >
        <boxGeometry args={[1.2, 0.12, 3.0]} />
      </AnimatedPart>

      {/* ── Midsole ── */}
      <AnimatedPart
        partName="midsole"
        color={partColors.midsole || DEFAULT_COLORS.midsole}
        materialType={partMaterials.midsole}
        selected={selectedPart === 'midsole'}
        onClick={(e) => handleClick(e, 'midsole')}
        position={[0, -0.2, 0.1]}
        castShadow
      >
        <boxGeometry args={[1.15, 0.14, 2.9]} />
      </AnimatedPart>

      {/* ── Upper body ── */}
      <AnimatedPart
        partName="upper"
        color={partColors.upper || DEFAULT_COLORS.upper}
        materialType={partMaterials.upper}
        selected={selectedPart === 'upper'}
        onClick={(e) => handleClick(e, 'upper')}
        position={[0, 0.05, -0.1]}
        castShadow
      >
        <boxGeometry args={[1.05, 0.45, 2.2]} />
      </AnimatedPart>

      {/* ── Toe box (rounded front) ── */}
      <AnimatedPart
        partName="toe"
        color={partColors.toe || DEFAULT_COLORS.toe}
        materialType={partMaterials.toe}
        selected={selectedPart === 'toe'}
        onClick={(e) => handleClick(e, 'toe')}
        position={[0, -0.05, 1.35]}
        scale={[0.55, 0.35, 0.55]}
        castShadow
      >
        <sphereGeometry args={[1, 24, 16]} />
      </AnimatedPart>

      {/* ── Heel counter ── */}
      <AnimatedPart
        partName="heel"
        color={partColors.heel || DEFAULT_COLORS.heel}
        materialType={partMaterials.heel}
        selected={selectedPart === 'heel'}
        onClick={(e) => handleClick(e, 'heel')}
        position={[0, 0.1, -1.2]}
        castShadow
      >
        <boxGeometry args={[1.0, 0.55, 0.3]} />
      </AnimatedPart>

      {/* ── Tongue ── */}
      <AnimatedPart
        partName="tongue"
        color={partColors.tongue || DEFAULT_COLORS.tongue}
        materialType={partMaterials.tongue}
        selected={selectedPart === 'tongue'}
        onClick={(e) => handleClick(e, 'tongue')}
        position={[0, 0.4, 0.0]}
        rotation={[0.25, 0, 0]}
        castShadow
      >
        <boxGeometry args={[0.55, 0.06, 1.3]} />
      </AnimatedPart>

      {/* ── Laces (accent strips across upper) ── */}
      {[-0.3, 0.0, 0.3, 0.55].map((z, i) => (
        <AnimatedPart
          key={`lace-${i}`}
          partName="laces"
          color={partColors.laces || DEFAULT_COLORS.laces}
          materialType={partMaterials.laces}
          selected={selectedPart === 'laces'}
          onClick={(e) => handleClick(e, 'laces')}
          position={[0, 0.3, z]}
          castShadow
        >
          <boxGeometry args={[0.8, 0.04, 0.06]} />
        </AnimatedPart>
      ))}

      {/* ── Logo (side panel decals) ── */}
      {/* Right side */}
      <AnimatedPart
        partName="logo"
        color={partColors.logo || DEFAULT_COLORS.logo}
        materialType={partMaterials.logo}
        selected={selectedPart === 'logo'}
        onClick={(e) => handleClick(e, 'logo')}
        position={[0.54, 0.08, 0.15]}
        rotation={[0, Math.PI / 2, 0]}
        doubleSide
      >
        <planeGeometry args={[0.9, 0.28]} />
      </AnimatedPart>
      {/* Left side (mirrored) */}
      <AnimatedPart
        partName="logo"
        color={partColors.logo || DEFAULT_COLORS.logo}
        materialType={partMaterials.logo}
        selected={selectedPart === 'logo'}
        onClick={(e) => handleClick(e, 'logo')}
        position={[-0.54, 0.08, 0.15]}
        rotation={[0, -Math.PI / 2, 0]}
        doubleSide
      >
        <planeGeometry args={[0.9, 0.28]} />
      </AnimatedPart>

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

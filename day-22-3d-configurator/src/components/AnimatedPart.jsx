/**
 * AnimatedPart.jsx — A single sneaker mesh part with animated color & material transitions.
 * Uses useAnimatedColor hook for smooth color lerping.
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useAnimatedColor from '../hooks/useAnimatedColor'

/** Material presets: roughness & metalness values */
const MAT_PRESETS = {
  matte: { roughness: 0.9, metalness: 0.0, envMapIntensity: 0.5 },
  glossy: { roughness: 0.15, metalness: 0.1, envMapIntensity: 0.8 },
  metallic: { roughness: 0.2, metalness: 0.9, envMapIntensity: 1.5 },
}

const LERP_SPEED = 4.0

export default function AnimatedPart({
  partName,
  color,
  materialType = 'matte',
  selected,
  onClick,
  children,
  doubleSide = false,
  ...meshProps
}) {
  const matRef = useRef()
  const animatedColor = useAnimatedColor(color)

  const target = MAT_PRESETS[materialType] || MAT_PRESETS.matte

  /* Smoothly lerp roughness, metalness, emissive */
  useFrame((_, delta) => {
    if (!matRef.current) return
    const mat = matRef.current
    const t = 1 - Math.exp(-LERP_SPEED * delta)

    mat.roughness += (target.roughness - mat.roughness) * t
    mat.metalness += (target.metalness - mat.metalness) * t
    mat.envMapIntensity += (target.envMapIntensity - mat.envMapIntensity) * t

    // Selection highlight
    const emTarget = selected ? 0.08 : 0.0
    mat.emissiveIntensity += (emTarget - mat.emissiveIntensity) * t

    // Apply animated color
    mat.color.copy(animatedColor)
  })

  return (
    <mesh onClick={onClick} {...meshProps}>
      {children}
      <meshStandardMaterial
        ref={matRef}
        color={color}
        roughness={target.roughness}
        metalness={target.metalness}
        envMapIntensity={target.envMapIntensity}
        emissive="#ffffff"
        emissiveIntensity={selected ? 0.08 : 0.0}
        side={doubleSide ? THREE.DoubleSide : THREE.FrontSide}
      />
    </mesh>
  )
}

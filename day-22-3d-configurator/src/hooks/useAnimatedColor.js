/**
 * useAnimatedColor.js — Hook that lerps a Three.js Color toward a target hex over time
 * Returns a reactive Three.js Color that smoothly transitions.
 */
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const LERP_SPEED = 4.0 // higher = faster transition

/**
 * @param {string} targetHex - The target hex color (e.g. '#ff0000')
 * @returns {THREE.Color} A Three.js Color instance that smoothly lerps
 */
export default function useAnimatedColor(targetHex) {
  const colorRef = useRef(new THREE.Color(targetHex))
  const targetColor = useMemo(() => new THREE.Color(targetHex), [targetHex])

  useFrame((_, delta) => {
    colorRef.current.lerp(targetColor, 1 - Math.exp(-LERP_SPEED * delta))
  })

  return colorRef.current
}

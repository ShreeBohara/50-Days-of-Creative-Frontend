import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { createCloudCanvas } from '../utils/textures'
import { GLOBE_RADIUS } from './EarthGlobe'

export default function CloudLayer({ reducedMotion = false }) {
  const meshRef = useRef(null)
  const cloudTexture = useMemo(() => {
    const texture = new THREE.CanvasTexture(createCloudCanvas())
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    return texture
  }, [])

  useEffect(() => () => cloudTexture.dispose(), [cloudTexture])

  useFrame((_, delta) => {
    if (!meshRef.current || reducedMotion) return
    meshRef.current.rotation.y += delta * 0.025
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[GLOBE_RADIUS * 1.012, 128, 128]} />
      <meshStandardMaterial
        map={cloudTexture}
        transparent
        opacity={0.72}
        depthWrite={false}
        roughness={1}
        metalness={0}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

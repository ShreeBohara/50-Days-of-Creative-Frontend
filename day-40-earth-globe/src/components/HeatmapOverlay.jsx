import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { createHeatmapCanvas } from '../utils/textures'
import { GLOBE_RADIUS } from './EarthGlobe'

export default function HeatmapOverlay({ visible }) {
  const heatTexture = useMemo(() => {
    const texture = new THREE.CanvasTexture(createHeatmapCanvas())
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    return texture
  }, [])

  useEffect(() => () => heatTexture.dispose(), [heatTexture])

  if (!visible) return null

  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS * 1.017, 128, 128]} />
      <meshBasicMaterial
        map={heatTexture}
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

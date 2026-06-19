import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { createEarthCanvases } from '../utils/textures'

export const GLOBE_RADIUS = 1.55

export default function EarthGlobe({ reducedMotion = false }) {
  const groupRef = useRef(null)
  const materialRef = useRef(null)
  const { mapTexture, bumpTexture } = useMemo(() => {
    const { mapCanvas, bumpCanvas } = createEarthCanvases()
    const colorMap = new THREE.CanvasTexture(mapCanvas)
    const reliefMap = new THREE.CanvasTexture(bumpCanvas)

    colorMap.colorSpace = THREE.SRGBColorSpace
    colorMap.anisotropy = 8
    reliefMap.anisotropy = 8

    return { mapTexture: colorMap, bumpTexture: reliefMap }
  }, [])

  useEffect(() => {
    return () => {
      mapTexture.dispose()
      bumpTexture.dispose()
    }
  }, [bumpTexture, mapTexture])

  useFrame((_, delta) => {
    if (!groupRef.current || reducedMotion) return
    groupRef.current.rotation.y += delta * 0.055
  })

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 160, 160]} />
        <meshStandardMaterial
          ref={materialRef}
          map={mapTexture}
          bumpMap={bumpTexture}
          bumpScale={0.032}
          roughness={0.68}
          metalness={0.02}
          color="#ffffff"
          emissive="#020617"
        />
      </mesh>
    </group>
  )
}

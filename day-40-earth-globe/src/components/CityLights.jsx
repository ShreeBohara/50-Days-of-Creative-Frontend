import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { cities } from '../data/cities'
import { latLngToVector3 } from '../utils/geo'
import { GLOBE_RADIUS } from './EarthGlobe'

function CityLight({ city, reducedMotion, sunDirection }) {
  const meshRef = useRef(null)
  const materialRef = useRef(null)
  const worldPosition = useMemo(() => new THREE.Vector3(), [])
  const sunVector = useMemo(() => new THREE.Vector3(), [])
  const position = useMemo(() => {
    const vector = latLngToVector3(city.lat, city.lng, GLOBE_RADIUS * 1.018)
    return [vector.x, vector.y, vector.z]
  }, [city.lat, city.lng])
  const scale = 0.012 + Math.min(city.population / 38_000_000, 1) * 0.022

  useFrame(({ clock }) => {
    if (!meshRef.current || !materialRef.current) return

    meshRef.current.getWorldPosition(worldPosition)
    worldPosition.normalize()
    sunVector.set(sunDirection.x, sunDirection.y, sunDirection.z).normalize()

    const sunFacing = worldPosition.dot(sunVector)
    const nightOpacity = THREE.MathUtils.clamp((0.12 - sunFacing) / 0.5, 0, 1)
    const twinkle = reducedMotion ? 0.62 : 0.55 + Math.sin(clock.elapsedTime * 2.5 + city.lng) * 0.12
    materialRef.current.opacity = nightOpacity * twinkle
  })

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[scale, 12, 12]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#f59e0b"
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  )
}

export default function CityLights({ reducedMotion = false, sunDirection }) {
  return (
    <group>
      {cities.map((city) => (
        <CityLight city={city} key={city.id} reducedMotion={reducedMotion} sunDirection={sunDirection} />
      ))}
    </group>
  )
}

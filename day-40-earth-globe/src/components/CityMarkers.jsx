import { Html } from '@react-three/drei'
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { cities } from '../data/cities'
import { formatPopulation, latLngToVector3 } from '../utils/geo'
import { GLOBE_RADIUS } from './EarthGlobe'

function Marker({ city, isSelected, onSelect }) {
  const [isHovered, setIsHovered] = useState(false)
  const position = useMemo(() => {
    const vector = latLngToVector3(city.lat, city.lng, GLOBE_RADIUS * 1.035)
    return [vector.x, vector.y, vector.z]
  }, [city.lat, city.lng])
  const markerScale = 0.018 + Math.min(city.population / 38_000_000, 1) * 0.02

  const handlePointerOver = (event) => {
    event.stopPropagation()
    setIsHovered(true)
    document.body.style.cursor = 'pointer'
  }

  const handlePointerOut = (event) => {
    event.stopPropagation()
    setIsHovered(false)
    document.body.style.cursor = ''
  }

  const handleClick = (event) => {
    event.stopPropagation()
    onSelect(city.id)
  }

  return (
    <group position={position}>
      <mesh
        onClick={handleClick}
        onPointerOut={handlePointerOut}
        onPointerOver={handlePointerOver}
        scale={isSelected || isHovered ? 1.32 : 1}
      >
        <sphereGeometry args={[markerScale, 18, 18]} />
        <meshBasicMaterial
          color={isSelected ? '#f59e0b' : '#22d3ee'}
          toneMapped={false}
          transparent
          opacity={isSelected ? 1 : 0.86}
        />
      </mesh>
      <mesh scale={isSelected || isHovered ? 1.45 : 1}>
        <ringGeometry args={[markerScale * 1.8, markerScale * 2.25, 32]} />
        <meshBasicMaterial
          color={isSelected ? '#f59e0b' : '#22d3ee'}
          transparent
          opacity={isSelected ? 0.56 : 0.24}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {(isHovered || isSelected) && (
        <Html center distanceFactor={5.8} position={[0, markerScale * 6.2, 0]} zIndexRange={[40, 10]}>
          <div className="city-tooltip">
            <strong>{city.name}</strong>
            <span>{city.country}</span>
            <small>{formatPopulation(city.population)} metro</small>
          </div>
        </Html>
      )}
    </group>
  )
}

export default function CityMarkers({ selectedCityId, onSelectCity }) {
  return (
    <group>
      {cities.map((city) => (
        <Marker city={city} isSelected={selectedCityId === city.id} key={city.id} onSelect={onSelectCity} />
      ))}
    </group>
  )
}

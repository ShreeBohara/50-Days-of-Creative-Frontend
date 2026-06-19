import { Html } from '@react-three/drei'
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { countryMetrics } from '../data/countries'
import { latLngToVector3 } from '../utils/geo'
import { GLOBE_RADIUS } from './EarthGlobe'

function Hotspot({ country, isSelected, onSelectCountry, visible }) {
  const [isHovered, setIsHovered] = useState(false)
  const position = useMemo(() => {
    const vector = latLngToVector3(country.centroid.lat, country.centroid.lng, GLOBE_RADIUS * 1.045)
    return [vector.x, vector.y, vector.z]
  }, [country.centroid.lat, country.centroid.lng])
  const color = country.score > 84 ? '#ef4444' : country.score > 72 ? '#f59e0b' : '#22c55e'

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
    onSelectCountry(country.iso)
  }

  if (!visible && !isSelected) return null

  return (
    <group position={position}>
      <mesh onClick={handleClick} onPointerOut={handlePointerOut} onPointerOver={handlePointerOver}>
        <sphereGeometry args={[0.034, 18, 18]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isSelected ? 0.95 : 0.55}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh scale={isSelected || isHovered ? 1.34 : 1}>
        <ringGeometry args={[0.055, 0.073, 34]} />
        <meshBasicMaterial color={color} transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>
      {isHovered && (
        <Html center distanceFactor={5.6} position={[0, 0.2, 0]} zIndexRange={[35, 10]}>
          <div className="city-tooltip country-tooltip">
            <strong>{country.name}</strong>
            <span>Heat score {country.score}</span>
            <small>GDP {country.gdpIndex} - Pop {country.populationIndex}</small>
          </div>
        </Html>
      )}
    </group>
  )
}

export default function CountryHotspots({ heatmapEnabled, onSelectCountry, selectedCountryIso }) {
  return (
    <group>
      {countryMetrics.map((country) => (
        <Hotspot
          country={country}
          isSelected={selectedCountryIso === country.iso}
          key={country.iso}
          onSelectCountry={onSelectCountry}
          visible={heatmapEnabled}
        />
      ))}
    </group>
  )
}

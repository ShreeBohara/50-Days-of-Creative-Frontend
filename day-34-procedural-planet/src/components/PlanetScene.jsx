import { OrbitControls, Stars } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { DEFAULT_PLANET_SETTINGS, sunVectorFromAngles } from '../data/planetConfig'
import Planet from './Planet'

function SunMarker({ position }) {
  return (
    <group position={position}>
      <pointLight intensity={4.8} distance={9} color="#fff2c7" />
      <mesh>
        <sphereGeometry args={[0.12, 32, 32]} />
        <meshBasicMaterial color="#fff7cc" toneMapped={false} />
      </mesh>
      <mesh scale={[1, 1, 0.08]}>
        <ringGeometry args={[0.2, 0.34, 48]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.24} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export default function PlanetScene({ settings = DEFAULT_PLANET_SETTINGS }) {
  const { scene } = useThree()
  const sunDirection = useMemo(
    () => new THREE.Vector3(...sunVectorFromAngles(settings.sunAzimuth, settings.sunElevation)).normalize(),
    [settings.sunAzimuth, settings.sunElevation],
  )
  const sunPosition = useMemo(() => sunDirection.clone().multiplyScalar(5.8), [sunDirection])

  useEffect(() => {
    scene.background = new THREE.Color('#02040a')
    scene.fog = new THREE.FogExp2('#02040a', 0.018)
  }, [scene])

  return (
    <>
      <ambientLight intensity={0.16} />
      <directionalLight position={sunPosition.toArray()} intensity={2.6} color="#f8fafc" />
      <pointLight position={[-5, -2, -3]} intensity={0.7} color="#38bdf8" />

      <Stars
        radius={90}
        depth={48}
        count={3600}
        factor={4}
        saturation={0.1}
        fade
        speed={0.35}
      />

      <SunMarker position={sunPosition.toArray()} />

      <Planet settings={settings} />

      <OrbitControls
        enableDamping
        dampingFactor={0.06}
        minDistance={3}
        maxDistance={8}
        autoRotate={settings.rotationSpeed > 0}
        autoRotateSpeed={settings.rotationSpeed > 0 ? 0.35 : 0}
      />
    </>
  )
}

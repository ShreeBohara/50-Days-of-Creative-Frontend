import { OrbitControls, Stars } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { sunDirectionFromTime } from '../utils/geo'
import CameraRig from './CameraRig'
import EarthGlobe from './EarthGlobe'
import Terminator from './Terminator'

function SunMarker({ position }) {
  return (
    <group position={position}>
      <pointLight intensity={3.6} distance={8} color="#fff4cf" />
      <mesh>
        <sphereGeometry args={[0.07, 28, 28]} />
        <meshBasicMaterial color="#fff4cf" toneMapped={false} />
      </mesh>
      <mesh scale={[1, 1, 0.08]}>
        <ringGeometry args={[0.14, 0.23, 48]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.34} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export default function GlobeScene({ reducedMotion = false, timeOfDay = 18 }) {
  const sunDirection = useMemo(() => sunDirectionFromTime(timeOfDay), [timeOfDay])
  const sunPosition = useMemo(
    () => [sunDirection.x * 6.4, sunDirection.y * 6.4, sunDirection.z * 6.4],
    [sunDirection],
  )

  return (
    <>
      <color attach="background" args={['#020617']} />
      <fogExp2 attach="fog" args={['#020617', 0.018]} />
      <ambientLight intensity={0.16} />
      <directionalLight position={sunPosition} intensity={2.8} color="#f8fafc" />
      <pointLight position={[-4, -2, -3]} intensity={0.9} color="#22d3ee" />
      <Stars radius={90} depth={48} count={4200} factor={4.2} saturation={0.18} fade speed={0.25} />
      <SunMarker position={sunPosition} />
      <EarthGlobe reducedMotion={reducedMotion} sunDirection={sunDirection} />
      <Terminator sunDirection={sunDirection} />
      <CameraRig />
      <OrbitControls
        enableDamping
        dampingFactor={0.06}
        minDistance={2.5}
        maxDistance={6.5}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.45}
      />
    </>
  )
}

import { OrbitControls, Stars } from '@react-three/drei'
import CameraRig from './CameraRig'
import EarthGlobe from './EarthGlobe'

export default function GlobeScene({ reducedMotion = false }) {
  return (
    <>
      <color attach="background" args={['#020617']} />
      <fogExp2 attach="fog" args={['#020617', 0.018]} />
      <ambientLight intensity={0.2} />
      <directionalLight position={[4, 2.2, 3]} intensity={2.4} color="#f8fafc" />
      <pointLight position={[-4, -2, -3]} intensity={0.9} color="#22d3ee" />
      <Stars radius={90} depth={48} count={4200} factor={4.2} saturation={0.18} fade speed={0.25} />
      <EarthGlobe reducedMotion={reducedMotion} />
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

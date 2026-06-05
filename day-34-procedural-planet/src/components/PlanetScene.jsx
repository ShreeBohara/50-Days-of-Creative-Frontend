import { OrbitControls, Stars } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'

export default function PlanetScene() {
  const { scene } = useThree()

  useEffect(() => {
    scene.background = new THREE.Color('#02040a')
    scene.fog = new THREE.FogExp2('#02040a', 0.018)
  }, [scene])

  return (
    <>
      <ambientLight intensity={0.16} />
      <directionalLight position={[5, 3, 4]} intensity={2.6} color="#f8fafc" />
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

      <mesh position={[5, 3, 4]}>
        <sphereGeometry args={[0.08, 24, 24]} />
        <meshBasicMaterial color="#fff7cc" toneMapped={false} />
      </mesh>

      <OrbitControls
        enableDamping
        dampingFactor={0.06}
        minDistance={3}
        maxDistance={8}
        autoRotate
        autoRotateSpeed={0.35}
      />
    </>
  )
}

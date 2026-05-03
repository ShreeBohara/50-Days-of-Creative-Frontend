import { useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * TunnelScene — Main scene orchestrator.
 * Configures the scene environment and holds child 3D components.
 */
export default function TunnelScene() {
  const { scene } = useThree()

  /* Ensure pitch-black background */
  scene.background = new THREE.Color(0x000000)
  scene.fog = new THREE.FogExp2(0x000000, 0.015)

  return (
    <>
      {/* Soft ambient illumination so geometry is faintly visible */}
      <ambientLight intensity={0.15} />

      {/* Point light attached near camera position for inner glow */}
      <pointLight position={[0, 0, 2]} intensity={1.5} color="#a855f7" distance={20} decay={2} />

      {/* Placeholder tunnel stand-in — will be replaced in commit 3 */}
      <mesh position={[0, 0, -5]}>
        <torusGeometry args={[3, 0.5, 16, 48]} />
        <meshStandardMaterial color="#7c3aed" wireframe emissive="#4c1d95" emissiveIntensity={0.4} />
      </mesh>

      <mesh position={[0, 0, -12]}>
        <torusGeometry args={[3, 0.5, 16, 48]} />
        <meshStandardMaterial color="#6d28d9" wireframe emissive="#4c1d95" emissiveIntensity={0.3} />
      </mesh>

      <mesh position={[0, 0, -19]}>
        <torusGeometry args={[3, 0.5, 16, 48]} />
        <meshStandardMaterial color="#5b21b6" wireframe emissive="#4c1d95" emissiveIntensity={0.2} />
      </mesh>
    </>
  )
}

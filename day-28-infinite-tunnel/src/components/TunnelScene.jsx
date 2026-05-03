import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Tunnel from './Tunnel'

/**
 * TunnelScene — Main scene orchestrator.
 * Configures the scene environment and holds child 3D components.
 */
export default function TunnelScene() {
  const { scene } = useThree()

  /* Pitch-black background with exponential fog for depth fade */
  scene.background = new THREE.Color(0x000000)
  scene.fog = new THREE.FogExp2(0x000000, 0.008)

  return (
    <>
      {/* Ambient fill light so the tunnel walls are faintly visible */}
      <ambientLight intensity={0.2} />

      {/* Point light near camera for inner glow on nearby walls */}
      <pointLight position={[0, 0, 0]} intensity={2} color="#c084fc" distance={30} decay={2} />

      {/* The procedural tube */}
      <Tunnel />
    </>
  )
}

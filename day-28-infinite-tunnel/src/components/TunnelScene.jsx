import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Tunnel from './Tunnel'
import Effects from './Effects'

/**
 * TunnelScene — Main scene orchestrator.
 * Configures the scene environment, renders the tunnel, and applies post-processing.
 */
export default function TunnelScene() {
  const { scene } = useThree()

  /* Pitch-black background with exponential fog for depth fade */
  scene.background = new THREE.Color(0x000000)
  scene.fog = new THREE.FogExp2(0x000000, 0.008)

  return (
    <>
      {/* Ambient fill light */}
      <ambientLight intensity={0.2} />

      {/* Point light near camera for inner glow on nearby walls */}
      <pointLight position={[0, 0, 0]} intensity={2} color="#c084fc" distance={30} decay={2} />

      {/* The procedural tube with shader and flight camera */}
      <Tunnel />

      {/* Post-processing: bloom, chromatic aberration, vignette, grain */}
      <Effects />
    </>
  )
}

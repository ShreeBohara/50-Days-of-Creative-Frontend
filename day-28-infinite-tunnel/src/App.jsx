import { Canvas } from '@react-three/fiber'
import './App.css'

/**
 * App — Root component for the Infinite Psychedelic Tunnel.
 * Sets up the R3F Canvas and will later hold the HUD overlay.
 */
export default function App() {
  return (
    <div id="app-container">
      <Canvas
        camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 5] }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#000' }}
      >
        <ambientLight intensity={0.3} />
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#a855f7" wireframe />
        </mesh>
      </Canvas>
    </div>
  )
}

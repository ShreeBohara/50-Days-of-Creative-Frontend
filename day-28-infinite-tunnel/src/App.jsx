import { Canvas } from '@react-three/fiber'
import TunnelScene from './components/TunnelScene'
import './App.css'

/**
 * App — Root component for the Infinite Psychedelic Tunnel.
 * Sets up the R3F Canvas with camera positioned at the tunnel origin
 * and will later hold the HUD overlay.
 */
export default function App() {
  return (
    <div id="app-container">
      <Canvas
        camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 0] }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
        style={{ background: '#000' }}
      >
        <TunnelScene />
      </Canvas>
    </div>
  )
}
